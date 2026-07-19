const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ROLES_VALIDOS = ['admin', 'vendedor', 'comprador'];

async function listar(req, res) {
  const { rol } = req.query;
  let query = 'SELECT id, nombre, email, rol, activo, created_at FROM usuarios';
  const params = [];
  if (rol) {
    if (!ROLES_VALIDOS.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    query += ' WHERE rol = $1';
    params.push(rol);
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
}

/**
 * Busca un comprador por email exacto. La usan admin y vendedor para asignar
 * un comprador existente a un crédito sin exponer el listado completo de
 * compradores (que podrían pertenecer a otros vendedores).
 */
async function buscarPorEmail(req, res) {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Falta el email a buscar.' });

  const { rows } = await pool.query(
    "SELECT id, nombre, email, rol, activo FROM usuarios WHERE email = $1 AND rol = 'comprador'",
    [email]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No se encontró un comprador con ese correo.' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Nombre, email, password y rol son requeridos.' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }
  if (req.usuario.rol === 'vendedor' && rol !== 'comprador') {
    return res.status(403).json({ error: 'Un vendedor solo puede crear cuentas de comprador.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nombre, email, rol, activo, created_at`,
      [nombre, email.toLowerCase().trim(), hash, rol]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });
    throw err;
  }
}

async function actualizar(req, res) {
  const { nombre, email, rol, activo, password } = req.body;
  if (!nombre || !email || !rol) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos.' });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido.' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  let hashSet = '';
  const params = [nombre, email.toLowerCase().trim(), rol, activo !== false, req.params.id];
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    hashSet = ', password_hash = $6';
    params.push(hash);
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4 ${hashSet} WHERE id = $5
       RETURNING id, nombre, email, rol, activo, created_at`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ya existe un usuario con ese correo.' });
    throw err;
  }
}

module.exports = { listar, buscarPorEmail, crear, actualizar };
