const pool = require('../config/db');

/**
 * Toma el id del crédito desde un param de la URL (ej. :creditoId o :id en
 * rutas anidadas bajo /creditos) y lo deja en req.creditoId.
 */
function resolverCreditoId(paramName = 'creditoId') {
  return (req, res, next) => {
    req.creditoId = req.params[paramName];
    next();
  };
}

/**
 * Para rutas "planas" (ej. PUT /api/pagos/:id) donde no viene el creditoId
 * en la URL: lo busca en la tabla del recurso y lo deja en req.creditoId.
 * `tabla` es un nombre de tabla fijo definido en el código (no viene del
 * usuario), así que es seguro interpolarlo directo en el SQL.
 */
function resolverCreditoDesdeTabla(tabla, paramName = 'id') {
  return async (req, res, next) => {
    const { rows } = await pool.query(
      `SELECT credito_id FROM ${tabla} WHERE id = $1`,
      [req.params[paramName]]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado.' });
    req.creditoId = rows[0].credito_id;
    next();
  };
}

async function obtenerPermiso(rolClave, pantallaClave) {
  const { rows } = await pool.query(
    'SELECT puede_ver, puede_crear, puede_editar FROM permisos_rol WHERE rol_clave = $1 AND pantalla_clave = $2',
    [rolClave, pantallaClave]
  );
  return rows[0] || { puede_ver: false, puede_crear: false, puede_editar: false };
}

/**
 * Verifica el permiso de PANTALLA (matriz configurable en /roles-permisos),
 * sin verificar dueño de ningún crédito en particular. Se usa para acciones
 * que no cuelgan de un crédito ya existente (ej. crear un crédito nuevo).
 * nivel: 'lectura' | 'crear' | 'editar'
 */
function permisoPantalla(nivel, pantalla) {
  return async (req, res, next) => {
    if (req.usuario.rol === 'admin') return next();

    const permiso = await obtenerPermiso(req.usuario.rol, pantalla);
    if (!permiso.puede_ver) return res.status(403).json({ error: 'No tienes acceso a esta pantalla.' });
    if (nivel === 'crear' && !permiso.puede_crear) {
      return res.status(403).json({ error: 'Tu rol no tiene permiso para crear aquí.' });
    }
    if (nivel === 'editar' && !permiso.puede_editar) {
      return res.status(403).json({ error: 'Tu rol no tiene permiso para editar aquí.' });
    }
    next();
  };
}

/**
 * Verifica permiso de pantalla (matriz configurable) Y dueño del crédito en
 * req.creditoId, según el rol:
 * - admin: acceso total, siempre pasa.
 * - vendedor: necesita permiso de pantalla Y que el crédito sea suyo (vendedor_id).
 * - comprador: necesita permiso de pantalla Y que el crédito sea suyo (comprador_id).
 * nivel: 'lectura' | 'crear' | 'editar'
 */
function permisoCredito(nivel, pantalla) {
  return async (req, res, next) => {
    const usuario = req.usuario;

    if (usuario.rol !== 'admin' && pantalla) {
      const permiso = await obtenerPermiso(usuario.rol, pantalla);
      if (!permiso.puede_ver) return res.status(403).json({ error: 'No tienes acceso a esta pantalla.' });
      if (nivel === 'crear' && !permiso.puede_crear) {
        return res.status(403).json({ error: 'Tu rol no tiene permiso para crear aquí.' });
      }
      if (nivel === 'editar' && !permiso.puede_editar) {
        return res.status(403).json({ error: 'Tu rol no tiene permiso para editar aquí.' });
      }
    }

    if (usuario.rol === 'admin') return next();

    const { rows } = await pool.query(
      'SELECT vendedor_id, comprador_id FROM creditos WHERE id = $1',
      [req.creditoId]
    );
    const credito = rows[0];
    if (!credito) return res.status(404).json({ error: 'Crédito no encontrado.' });

    if (usuario.rol === 'vendedor') {
      if (String(credito.vendedor_id) !== String(usuario.id)) {
        return res.status(403).json({ error: 'No tienes acceso a este crédito.' });
      }
      return next();
    }

    if (usuario.rol === 'comprador') {
      if (String(credito.comprador_id) !== String(usuario.id)) {
        return res.status(403).json({ error: 'No tienes acceso a este crédito.' });
      }
      return next();
    }

    return res.status(403).json({ error: 'Rol no reconocido.' });
  };
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede realizar esta acción.' });
  }
  next();
}

function soloAdminOVendedor(req, res, next) {
  if (!['admin', 'vendedor'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
  }
  next();
}

module.exports = {
  resolverCreditoId,
  resolverCreditoDesdeTabla,
  obtenerPermiso,
  permisoPantalla,
  permisoCredito,
  soloAdmin,
  soloAdminOVendedor,
};
