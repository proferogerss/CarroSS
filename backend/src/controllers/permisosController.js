const pool = require('../config/db');

/**
 * Devuelve la matriz de permisos del usuario autenticado, indexada por
 * pantalla. El admin siempre recibe todo en TRUE (bypass real en el
 * middleware; esto es solo para que el frontend no tenga que tratarlo
 * como caso especial).
 */
async function miMatriz(req, res) {
  const { rows: pantallas } = await pool.query('SELECT clave FROM pantallas ORDER BY orden');

  if (req.usuario.rol === 'admin') {
    const permisos = {};
    for (const p of pantallas) {
      permisos[p.clave] = { puede_ver: true, puede_crear: true, puede_editar: true };
    }
    return res.json(permisos);
  }

  const { rows } = await pool.query(
    'SELECT pantalla_clave, puede_ver, puede_crear, puede_editar FROM permisos_rol WHERE rol_clave = $1',
    [req.usuario.rol]
  );

  const permisos = {};
  for (const p of pantallas) permisos[p.clave] = { puede_ver: false, puede_crear: false, puede_editar: false };
  for (const row of rows) {
    permisos[row.pantalla_clave] = {
      puede_ver: row.puede_ver,
      puede_crear: row.puede_crear,
      puede_editar: row.puede_editar,
    };
  }
  res.json(permisos);
}

async function listarRoles(req, res) {
  const { rows } = await pool.query('SELECT clave, nombre, es_sistema, activo FROM roles WHERE activo = TRUE ORDER BY clave');
  res.json(rows);
}

async function obtenerMatriz(req, res) {
  const { rolClave } = req.params;

  const { rows: rol } = await pool.query('SELECT clave FROM roles WHERE clave = $1', [rolClave]);
  if (!rol[0]) return res.status(404).json({ error: 'Rol no encontrado.' });

  const { rows } = await pool.query(
    `SELECT p.clave AS pantalla_clave, p.nombre AS pantalla_nombre, p.orden,
        COALESCE(pr.puede_ver, FALSE) AS puede_ver,
        COALESCE(pr.puede_crear, FALSE) AS puede_crear,
        COALESCE(pr.puede_editar, FALSE) AS puede_editar
     FROM pantallas p
     LEFT JOIN permisos_rol pr ON pr.pantalla_clave = p.clave AND pr.rol_clave = $1
     ORDER BY p.orden`,
    [rolClave]
  );

  res.json(rows);
}

async function guardarMatriz(req, res) {
  const { rolClave } = req.params;
  const { permisos } = req.body;

  if (rolClave === 'admin') {
    return res.status(400).json({ error: 'El rol Administrador siempre tiene acceso total; no se puede editar.' });
  }
  const { rows: rol } = await pool.query('SELECT clave FROM roles WHERE clave = $1', [rolClave]);
  if (!rol[0]) return res.status(404).json({ error: 'Rol no encontrado.' });
  if (!Array.isArray(permisos)) {
    return res.status(400).json({ error: 'Formato inválido: se esperaba un arreglo de permisos.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of permisos) {
      await client.query(
        `INSERT INTO permisos_rol (rol_clave, pantalla_clave, puede_ver, puede_crear, puede_editar)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (rol_clave, pantalla_clave)
         DO UPDATE SET puede_ver=$3, puede_crear=$4, puede_editar=$5`,
        [rolClave, p.pantalla_clave, !!p.puede_ver, !!p.puede_crear, !!p.puede_editar]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT p.clave AS pantalla_clave, p.nombre AS pantalla_nombre, p.orden,
        COALESCE(pr.puede_ver, FALSE) AS puede_ver,
        COALESCE(pr.puede_crear, FALSE) AS puede_crear,
        COALESCE(pr.puede_editar, FALSE) AS puede_editar
     FROM pantallas p
     LEFT JOIN permisos_rol pr ON pr.pantalla_clave = p.clave AND pr.rol_clave = $1
     ORDER BY p.orden`,
    [rolClave]
  );
  res.json(rows);
}

module.exports = { miMatriz, listarRoles, obtenerMatriz, guardarMatriz };
