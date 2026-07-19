const pool = require('../config/db');

/**
 * Toma el id del crédito desde un param de la URL (ej. :creditoId o :id en
 * rutas anidadas bajo /creditos) y lo deja en req.creditoId para que
 * permisoCredito() lo use.
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

/**
 * Verifica que req.usuario tenga acceso al crédito en req.creditoId, según su rol:
 * - admin: acceso total, siempre pasa.
 * - vendedor: solo si el crédito le pertenece (vendedor_id). Lectura y escritura.
 * - comprador: solo si el crédito es el suyo (comprador_id). Solo lectura.
 */
function permisoCredito(nivel) {
  return async (req, res, next) => {
    const usuario = req.usuario;
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
      if (nivel === 'escritura') {
        return res.status(403).json({ error: 'Tu cuenta solo tiene permiso de lectura.' });
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
  permisoCredito,
  soloAdmin,
  soloAdminOVendedor,
};
