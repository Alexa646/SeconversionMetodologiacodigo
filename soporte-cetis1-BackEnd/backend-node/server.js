// server.js – Servidor principal SoporteCETIS API
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const db      = require('./db');

const app  = express();
const PORT = 3000;

// ── Middlewares ───────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:4200' })); // solo permite Angular
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// AUTH  –  POST /api/auth
// ═══════════════════════════════════════════════════════════════
app.post('/api/auth', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1',
      [email]
    );
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    delete user.password; // nunca devolver el hash
    res.json({ ok: true, usuario: user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// TICKETS
// ═══════════════════════════════════════════════════════════════

// GET /api/tickets  –  lista con filtros opcionales
app.get('/api/tickets', async (req, res) => {
  try {
    let sql = `
      SELECT t.*,
             u1.nombre AS solicitante_nombre,
             u2.nombre AS tecnico_nombre
      FROM   tickets t
      JOIN   usuarios u1 ON u1.id = t.solicitante_id
      LEFT JOIN usuarios u2 ON u2.id = t.tecnico_id
      WHERE  1=1
    `;
    const params = [];

    if (req.query.solicitante_id) { sql += ' AND t.solicitante_id = ?'; params.push(req.query.solicitante_id); }
    if (req.query.tecnico_id)     { sql += ' AND t.tecnico_id = ?';     params.push(req.query.tecnico_id); }
    if (req.query.estado)         { sql += ' AND t.estado = ?';         params.push(req.query.estado); }

    sql += ' ORDER BY t.creado_en DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/tickets/:id  –  detalle con mensajes e historial
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [[ticket]] = await db.query(`
      SELECT t.*,
             u1.nombre AS solicitante_nombre,
             u2.nombre AS tecnico_nombre
      FROM   tickets t
      JOIN   usuarios u1 ON u1.id = t.solicitante_id
      LEFT JOIN usuarios u2 ON u2.id = t.tecnico_id
      WHERE  t.id = ?
    `, [id]);

    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

    const [mensajes] = await db.query(`
      SELECT m.*, u.nombre AS autor, u.rol AS autor_rol
      FROM   mensajes m
      JOIN   usuarios u ON u.id = m.usuario_id
      WHERE  m.ticket_id = ?
      ORDER  BY m.creado_en ASC
    `, [id]);

    const [historial] = await db.query(`
      SELECT h.*, u.nombre AS autor
      FROM   historial_estados h
      JOIN   usuarios u ON u.id = h.usuario_id
      WHERE  h.ticket_id = ?
      ORDER  BY h.creado_en ASC
    `, [id]);

    ticket.mensajes  = mensajes;
    ticket.historial = historial;
    res.json(ticket);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/tickets  –  crear nuevo ticket
app.post('/api/tickets', async (req, res) => {
  const { categoria, area, descripcion, prioridad, solicitante_id } = req.body;

  if (!categoria || !area || !descripcion || !prioridad || !solicitante_id)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  if (descripcion.length < 20)
    return res.status(400).json({ error: 'La descripción debe tener al menos 20 caracteres' });

  try {
    // Generar ticket_id: TKT-YYYY-XXXX
    const anio = new Date().getFullYear();
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM tickets');
    const num      = String(Number(total) + 1).padStart(4, '0');
    const ticketId = `TKT-${anio}-${num}`;

    const [result] = await db.query(`
      INSERT INTO tickets (ticket_id, categoria, area, descripcion, prioridad, estado, solicitante_id)
      VALUES (?, ?, ?, ?, ?, 'Abierto', ?)
    `, [ticketId, categoria, area, descripcion, prioridad, solicitante_id]);

    const newId = result.insertId;

    // Registrar en historial
    await db.query(`
      INSERT INTO historial_estados (ticket_id, estado, nota, usuario_id)
      VALUES (?, 'Abierto', 'Ticket registrado.', ?)
    `, [newId, solicitante_id]);

    res.status(201).json({ ok: true, ticket_id: ticketId, id: newId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/tickets/:id  –  actualizar estado o técnico
app.patch('/api/tickets/:id', async (req, res) => {
  const { estado, tecnico_id, usuario_id, nota } = req.body;
  const id = req.params.id;

  try {
    if (estado !== undefined) {
      await db.query('UPDATE tickets SET estado = ? WHERE id = ?', [estado, id]);
    }
    if (tecnico_id !== undefined) {
      await db.query('UPDATE tickets SET tecnico_id = ? WHERE id = ?', [tecnico_id, id]);
    }
    if (estado && usuario_id) {
      await db.query(`
        INSERT INTO historial_estados (ticket_id, estado, nota, usuario_id)
        VALUES (?, ?, ?, ?)
      `, [id, estado, nota ?? null, usuario_id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// MENSAJES
// ═══════════════════════════════════════════════════════════════

// GET /api/mensajes?ticket_id=1
app.get('/api/mensajes', async (req, res) => {
  const { ticket_id } = req.query;
  if (!ticket_id) return res.status(400).json({ error: 'ticket_id requerido' });

  try {
    const [rows] = await db.query(`
      SELECT m.*, u.nombre AS autor, u.rol AS autor_rol
      FROM   mensajes m
      JOIN   usuarios u ON u.id = m.usuario_id
      WHERE  m.ticket_id = ?
      ORDER  BY m.creado_en ASC
    `, [ticket_id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/mensajes
app.post('/api/mensajes', async (req, res) => {
  const { ticket_id, usuario_id, mensaje } = req.body;
  if (!ticket_id || !usuario_id || !mensaje)
    return res.status(400).json({ error: 'ticket_id, usuario_id y mensaje son requeridos' });

  try {
    const [result] = await db.query(
      'INSERT INTO mensajes (ticket_id, usuario_id, mensaje) VALUES (?, ?, ?)',
      [ticket_id, usuario_id, mensaje.trim()]
    );
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════

// GET /api/usuarios?rol=Técnico
app.get('/api/usuarios', async (req, res) => {
  try {
    let sql = `
      SELECT id, nombre, email, rol, area,
             (SELECT COUNT(*) FROM tickets t
              WHERE t.tecnico_id = u.id
              AND t.estado NOT IN ('Resuelto','Cerrado','Cancelado')) AS tickets_activos
      FROM usuarios u
      WHERE activo = 1
    `;
    const params = [];
    if (req.query.rol) { sql += ' AND rol = ?'; params.push(req.query.rol); }
    sql += ' ORDER BY nombre';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/usuarios  –  crear nuevo usuario (solo admin)
app.post('/api/usuarios', async (req, res) => {
  const { nombre, email, password, rol, area } = req.body;

  if (!nombre || !email || !password || !rol)
    return res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' });

  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    // Verificar que el email no exista ya
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0)
      return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });

    const hash = bcrypt.hashSync(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol, area) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), email.trim().toLowerCase(), hash, rol, area ?? '']
    );

    res.status(201).json({ ok: true, id: result.insertId, nombre, email, rol });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/usuarios/:id  –  editar usuario
app.put('/api/usuarios/:id', async (req, res) => {
  const { nombre, email, password, rol, area } = req.body;
  const id = req.params.id;

  if (!nombre || !email || !rol)
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos' });

  try {
    const [existe] = await db.query(
      'SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]
    );
    if (existe.length > 0)
      return res.status(400).json({ error: 'Ya existe otro usuario con ese correo' });

    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, password=?, rol=?, area=? WHERE id=?',
        [nombre.trim(), email.trim().toLowerCase(), hash, rol, area ?? '', id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre=?, email=?, rol=?, area=? WHERE id=?',
        [nombre.trim(), email.trim().toLowerCase(), rol, area ?? '', id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/usuarios/:id  –  desactivar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.listen(PORT, () => {
  console.log(`✅ SoporteCETIS API corriendo en http://localhost:${PORT}`);
  console.log(`   Prueba: http://localhost:${PORT}/api/tickets`);
});
