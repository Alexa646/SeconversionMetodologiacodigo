import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { TicketService, Ticket } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface Tecnico {
  id:              number;
  nombre:          string;
  rol:             string;
  area:            string;
  tickets_activos: number;
}

interface Usuario {
  id:     number;
  nombre: string;
  email:  string;
  rol:    string;
  area:   string;
}

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <div class="page-header">
        <div class="page-title">Panel de Administración</div>
        <div class="page-sub">{{ auth.usuario?.nombre }} · Vista general del sistema</div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--blue-light);padding-bottom:0;">
        <button *ngFor="let tab of tabs"
          (click)="tabActivo = tab.id"
          style="padding:8px 20px;border:none;background:none;cursor:pointer;font-family:'DM Sans',sans-serif;
            font-size:14px;font-weight:600;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;"
          [style.color]="tabActivo===tab.id ? 'var(--blue-mid)' : 'var(--gray)'"
          [style.borderBottomColor]="tabActivo===tab.id ? 'var(--blue-mid)' : 'transparent'">
          {{ tab.label }}
        </button>
      </div>

      <!-- ══ TAB: DASHBOARD ══ -->
      <div *ngIf="tabActivo==='dashboard'">

        <!-- STATS -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-num">{{ totalAbiertos }}</div>
            <div class="stat-label">Tickets abiertos</div>
          </div>
          <div class="stat-card red">
            <div class="stat-num">{{ sinAsignar.length }}</div>
            <div class="stat-label">Sin asignar</div>
          </div>
          <div class="stat-card green">
            <div class="stat-num">{{ totalResueltos }}</div>
            <div class="stat-label">Resueltos</div>
          </div>
          <div class="stat-card orange">
            <div class="stat-num">{{ totalCriticos }}</div>
            <div class="stat-label">Críticos activos</div>
          </div>
        </div>

        <!-- TÉCNICOS -->
        <div class="card" style="margin-bottom:16px;" *ngIf="tecnicos.length">
          <div style="font-size:15px;font-weight:700;color:var(--blue-dark);margin-bottom:14px;">
            👥 Carga de trabajo por técnico
          </div>
          <table class="data-table">
            <thead>
              <tr><th>Técnico</th><th>Tickets activos</th><th>Disponibilidad</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let tec of tecnicos">
                <td><strong>{{ tec.nombre }}</strong><br>
                  <span style="font-size:11px;color:var(--gray);">{{ tec.area }}</span>
                </td>
                <td>{{ tec.tickets_activos }}</td>
                <td>
                  <span [style.color]="tec.tickets_activos < 3 ? 'var(--green)' : 'var(--orange)'"
                    style="font-weight:600;">
                    {{ tec.tickets_activos < 3 ? 'Disponible' : 'Ocupado' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TICKETS SIN ASIGNAR -->
        <div class="card" style="margin-bottom:16px;">
          <div style="font-size:15px;font-weight:700;color:var(--blue-dark);margin-bottom:14px;">
            ⚠️ Tickets sin asignar ({{ sinAsignar.length }})
          </div>
          <div *ngIf="sinAsignar.length===0"
            style="text-align:center;padding:20px;color:var(--gray);font-size:13px;">
            ✅ Todos los tickets están asignados.
          </div>
          <table class="data-table" *ngIf="sinAsignar.length">
            <thead>
              <tr><th>ID</th><th>Descripción</th><th>Prioridad</th><th>Solicitante</th><th>Acción</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of sinAsignar">
                <td><span class="tc-id">{{ t.ticket_id }}</span></td>
                <td>{{ t.descripcion | slice:0:50 }}...</td>
                <td><span class="pri" [ngClass]="'pri-' + t.prioridad.toLowerCase()">{{ t.prioridad.toUpperCase() }}</span></td>
                <td>{{ t.solicitante_nombre }}</td>
                <td><button class="btn btn-primary btn-sm" (click)="abrirModalAsignar(t)">Asignar</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TODOS LOS TICKETS -->
        <div class="card">
          <div style="font-size:15px;font-weight:700;color:var(--blue-dark);margin-bottom:14px;">
            📋 Todos los tickets
          </div>
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Categoría</th><th>Estado</th><th>Prioridad</th><th>Solicitante</th><th>Técnico</th><th></th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of todosTickets">
                <td><span class="tc-id">{{ t.ticket_id }}</span></td>
                <td>{{ t.categoria }}</td>
                <td><span class="badge" [ngClass]="badgeEstado(t.estado)">{{ t.estado }}</span></td>
                <td><span class="pri" [ngClass]="'pri-' + t.prioridad.toLowerCase()">{{ t.prioridad.toUpperCase() }}</span></td>
                <td>{{ t.solicitante_nombre }}</td>
                <td>{{ t.tecnico_nombre ?? '—' }}</td>
                <td>
                  <button class="btn btn-outline btn-sm"
                    (click)="router.navigate(['/detalle-ticket'],{queryParams:{id:t.id}})">Ver</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ TAB: USUARIOS ══ -->
      <div *ngIf="tabActivo==='usuarios'">

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:15px;font-weight:700;color:var(--blue-dark);">
            👤 Gestión de usuarios ({{ todosUsuarios.length }})
          </div>
          <button class="btn btn-primary" (click)="abrirModalUsuario()">+ Crear usuario</button>
        </div>

        <div class="card">
          <table class="data-table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Área</th><th>Acción</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of todosUsuarios">
                <td><strong>{{ u.nombre }}</strong></td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="badge"
                    [ngClass]="u.rol==='Administrador' ? 'badge-cerrado' : u.rol==='Técnico' ? 'badge-atencion' : 'badge-abierto'">
                    {{ u.rol }}
                  </span>
                </td>
                <td>{{ u.area || '—' }}</td>
                <td style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" (click)="abrirModalEditar(u)">Editar</button>
                  <button class="btn btn-sm"
                    style="background:var(--red-light);color:var(--red);border:1px solid var(--red);"
                    (click)="eliminarUsuario(u)">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- ══ MODAL ASIGNAR TICKET ══ -->
    <div class="modal-overlay" [class.open]="modalAsignarAbierto" (click)="cerrarModal($event,'asignar')">
      <div class="modal">
        <h3>Asignar {{ ticketSeleccionado?.ticket_id }}</h3>
        <div style="font-size:13px;color:var(--gray);margin-bottom:14px;">
          {{ ticketSeleccionado?.descripcion | slice:0:80 }}...
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--blue-dark);margin-bottom:8px;">
          Selecciona el técnico:
        </div>
        <div class="tecnico-option" *ngFor="let tec of tecnicos"
          [class.selected]="tecnicoSeleccionadoId===tec.id"
          (click)="tecnicoSeleccionadoId=tec.id">
          <div>
            <div class="tecnico-name">{{ tec.nombre }}</div>
            <div class="tecnico-carga">{{ tec.tickets_activos }} tickets activos</div>
          </div>
          <span class="badge" [ngClass]="tec.tickets_activos<3 ? 'badge-resuelto':'badge-atencion'">
            {{ tec.tickets_activos < 3 ? 'Disponible' : 'Ocupado' }}
          </span>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" (click)="modalAsignarAbierto=false">Cancelar</button>
          <button class="btn btn-primary btn-sm" (click)="confirmarAsignacion()">✓ Confirmar</button>
        </div>
      </div>
    </div>

    <!-- ══ MODAL CREAR / EDITAR USUARIO ══ -->
    <div class="modal-overlay" [class.open]="modalUsuarioAbierto" (click)="cerrarModal($event,'usuario')">
      <div class="modal" style="max-width:500px;">
        <h3>{{ modoEdicion ? 'Editar usuario' : 'Crear nuevo usuario' }}</h3>

        <div class="form-group" style="margin-top:14px;">
          <label>Nombre completo <span class="req">*</span></label>
          <input type="text" placeholder="Ej. Juan Pérez" [(ngModel)]="nuevoUsuario.nombre">
        </div>

        <div class="form-group">
          <label>Correo institucional <span class="req">*</span></label>
          <input type="email" placeholder="usuario@cetis.edu.mx" [(ngModel)]="nuevoUsuario.email">
        </div>

        <div class="form-group">
          <label>
            Contraseña
            <span class="req" *ngIf="!modoEdicion">*</span>
            <span style="font-weight:400;color:var(--gray-mid);" *ngIf="modoEdicion">
              (dejar vacío para no cambiar)
            </span>
          </label>
          <input type="password" placeholder="Mínimo 6 caracteres" [(ngModel)]="nuevoUsuario.password">
        </div>

        <div class="form-group">
          <label>Rol <span class="req">*</span></label>
          <select [(ngModel)]="nuevoUsuario.rol">
            <option value="">Selecciona un rol...</option>
            <option>Solicitante</option>
            <option>Técnico</option>
            <option>Administrador</option>
          </select>
        </div>

        <div class="form-group">
          <label>Área / Departamento</label>
          <input type="text" placeholder="Ej. Área de Matemáticas" [(ngModel)]="nuevoUsuario.area">
        </div>

        <!-- Mensaje de error -->
        <div *ngIf="errUsuario"
          style="background:var(--red-light);color:var(--red);border-radius:var(--radius-sm);
            padding:10px 14px;font-size:13px;margin-bottom:12px;">
          ⚠️ {{ errUsuario }}
        </div>

        <!-- Mensaje de éxito -->
        <div *ngIf="okUsuario"
          style="background:var(--green-light);color:var(--green);border-radius:var(--radius-sm);
            padding:10px 14px;font-size:13px;margin-bottom:12px;">
          ✅ {{ okUsuario }}
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" (click)="modalUsuarioAbierto=false">Cancelar</button>
          <button class="btn btn-primary btn-sm" [disabled]="guardando" (click)="guardarUsuario()">
            {{ guardando ? 'Guardando...' : (modoEdicion ? '💾 Guardar cambios' : '✓ Crear usuario') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class PanelAdminComponent implements OnInit {
  todosTickets:          Ticket[]   = [];
  tecnicos:              Tecnico[]  = [];
  todosUsuarios:         Usuario[]  = [];
  tabActivo              = 'dashboard';
  modalAsignarAbierto    = false;
  modalUsuarioAbierto    = false;
  modoEdicion            = false;
  ticketSeleccionado:    Ticket | null = null;
  tecnicoSeleccionadoId: number | null = null;
  usuarioEditandoId:     number | null = null;
  guardando              = false;
  errUsuario             = '';
  okUsuario              = '';

  readonly tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'usuarios',  label: '👤 Usuarios'  },
  ];

  nuevoUsuario = { nombre: '', email: '', password: '', rol: '', area: '' };

  constructor(
    public router:     Router,
    public auth:       AuthService,
    private ticketSvc: TicketService,
    private http:      HttpClient,
    private cdr:       ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarTickets();
    this.cargarTecnicos();
    this.cargarUsuarios();
  }

  cargarTickets(): void {
    this.ticketSvc.getTickets().subscribe(data => {
      this.todosTickets = data;
      this.cdr.detectChanges();
    });
  }

  cargarTecnicos(): void {
    this.http.get<Tecnico[]>(`${environment.apiUrl}/usuarios?rol=Técnico`)
      .subscribe(data => { this.tecnicos = data; this.cdr.detectChanges(); });
  }

  cargarUsuarios(): void {
    this.http.get<Usuario[]>(`${environment.apiUrl}/usuarios`)
      .subscribe(data => { this.todosUsuarios = data; this.cdr.detectChanges(); });
  }

  get sinAsignar():    Ticket[] { return this.todosTickets.filter(t => !t.tecnico_id); }
  get totalAbiertos(): number   { return this.todosTickets.filter(t => t.estado === 'Abierto').length; }
  get totalResueltos(): number  { return this.todosTickets.filter(t => t.estado === 'Resuelto').length; }
  get totalCriticos(): number   { return this.todosTickets.filter(t => t.prioridad === 'Crítica' && !['Resuelto','Cerrado'].includes(t.estado)).length; }

  // ── Modal asignar ticket ──────────────────────────────────
  abrirModalAsignar(t: Ticket): void {
    this.ticketSeleccionado    = t;
    this.tecnicoSeleccionadoId = null;
    this.modalAsignarAbierto   = true;
  }

  confirmarAsignacion(): void {
    if (!this.ticketSeleccionado || !this.tecnicoSeleccionadoId) return;
    this.ticketSvc.actualizarTicket(this.ticketSeleccionado.id, {
      tecnico_id: this.tecnicoSeleccionadoId,
      estado:     'En atención',
      usuario_id: this.auth.usuario!.id,
      nota:       `Asignado por administrador.`,
    }).subscribe({
      next: () => {
        this.modalAsignarAbierto = false;
        this.cargarTickets();
        this.cargarTecnicos();
      }
    });
  }

  // ── Modal crear/editar usuario ────────────────────────────
  abrirModalUsuario(): void {
    this.modoEdicion        = false;
    this.usuarioEditandoId  = null;
    this.nuevoUsuario       = { nombre: '', email: '', password: '', rol: '', area: '' };
    this.errUsuario         = '';
    this.okUsuario          = '';
    this.modalUsuarioAbierto = true;
  }

  abrirModalEditar(u: Usuario): void {
    this.modoEdicion        = true;
    this.usuarioEditandoId  = u.id;
    this.nuevoUsuario       = { nombre: u.nombre, email: u.email, password: '', rol: u.rol, area: u.area };
    this.errUsuario         = '';
    this.okUsuario          = '';
    this.modalUsuarioAbierto = true;
  }

  guardarUsuario(): void {
    this.errUsuario = '';
    this.okUsuario  = '';

    const { nombre, email, password, rol } = this.nuevoUsuario;
    if (!nombre || !email || !rol) {
      this.errUsuario = 'Nombre, correo y rol son obligatorios.'; return;
    }
    if (!this.modoEdicion && !password) {
      this.errUsuario = 'La contraseña es obligatoria al crear un usuario.'; return;
    }
    if (password && password.length < 6) {
      this.errUsuario = 'La contraseña debe tener al menos 6 caracteres.'; return;
    }

    this.guardando = true;

    if (this.modoEdicion) {
      // Editar: solo enviar password si se escribió algo
      const body: Record<string,string> = { nombre, email, rol, area: this.nuevoUsuario.area };
      if (password) body['password'] = password;

      this.http.put(`${environment.apiUrl}/usuarios/${this.usuarioEditandoId}`, body)
        .subscribe({
          next: () => {
            this.guardando = false;
            this.okUsuario = 'Usuario actualizado correctamente.';
            this.cargarUsuarios();
            setTimeout(() => this.modalUsuarioAbierto = false, 1200);
          },
          error: (err) => {
            this.guardando  = false;
            this.errUsuario = err.error?.error ?? 'Error al actualizar el usuario.';
          }
        });
    } else {
      this.http.post(`${environment.apiUrl}/usuarios`, this.nuevoUsuario)
        .subscribe({
          next: () => {
            this.guardando = false;
            this.okUsuario = `Usuario "${nombre}" creado correctamente.`;
            this.cargarUsuarios();
            setTimeout(() => {
              this.modalUsuarioAbierto = false;
              this.nuevoUsuario = { nombre: '', email: '', password: '', rol: '', area: '' };
            }, 1200);
          },
          error: (err) => {
            this.guardando  = false;
            this.errUsuario = err.error?.error ?? 'Error al crear el usuario.';
          }
        });
    }
  }

  eliminarUsuario(u: Usuario): void {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción no se puede deshacer.`)) return;
    this.http.delete(`${environment.apiUrl}/usuarios/${u.id}`)
      .subscribe({ next: () => this.cargarUsuarios() });
  }

  cerrarModal(e: MouseEvent, tipo: string): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      if (tipo === 'asignar') this.modalAsignarAbierto  = false;
      if (tipo === 'usuario') this.modalUsuarioAbierto  = false;
    }
  }

  badgeEstado(estado: string): string {
    const map: Record<string,string> = {
      'Abierto':'badge-abierto','En atención':'badge-atencion',
      'Pendiente de usuario':'badge-pendiente','Resuelto':'badge-resuelto','Cerrado':'badge-cerrado',
    };
    return map[estado] ?? 'badge-abierto';
  }
}
