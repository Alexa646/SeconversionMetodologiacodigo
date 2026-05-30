// db.js – Conexión a MySQL de XAMPP
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: '',          // XAMPP no tiene contraseña por defecto
  database: 'soporte_cetis',
  port:     3306,
  waitForConnections: true,
  connectionLimit:    10,
});

module.exports = pool;
