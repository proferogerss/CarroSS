const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { firmarToken } = require('../utils/jwt');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  const { rows } = await pool.query(
    'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const usuario = rows[0];
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const token = firmarToken({
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });

  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}

async function me(req, res) {
  res.json({ usuario: req.usuario });
}

module.exports = { login, me };
