const pool = require('../config/db');

const SELECT_CON_JOIN = `
  SELECT c.*,
    v.nombre AS vendedor_nombre, v.email AS vendedor_email,
    cu.nombre AS comprador_nombre, cu.email AS comprador_email
  FROM creditos c
  LEFT JOIN usuarios v ON v.id = c.vendedor_id
  LEFT JOIN usuarios cu ON cu.id = c.comprador_id
`;

function validarCredito(body) {
  const requeridos = ['comprador', 'carro', 'fecha_compra', 'precio_auto', 'monto_financiar', 'tasa_anual', 'plazo_meses'];
  for (const campo of requeridos) {
    if (body[campo] === undefined || body[campo] === null || body[campo] === '') {
      return `El campo "${campo}" es requerido.`;
    }
  }
  if (Number(body.plazo_meses) <= 0) return 'El plazo en meses debe ser mayor a 0.';
  if (Number(body.monto_financiar) <= 0) return 'El monto a financiar debe ser mayor a 0.';
  if (body.dia_pago !== undefined && ![1, 15].includes(Number(body.dia_pago))) {
    return 'El día de pago debe ser 1 o 15.';
  }
  return null;
}

async function listar(req, res) {
  const { usuario } = req;
  let query = SELECT_CON_JOIN;
  const params = [];

  if (usuario.rol === 'vendedor') {
    query += ' WHERE c.vendedor_id = $1';
    params.push(usuario.id);
  } else if (usuario.rol === 'comprador') {
    query += ' WHERE c.comprador_id = $1';
    params.push(usuario.id);
  }
  query += ' ORDER BY c.activo DESC, c.created_at DESC';

  const { rows } = await pool.query(query, params);
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await pool.query(`${SELECT_CON_JOIN} WHERE c.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Crédito no encontrado.' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const errorValidacion = validarCredito(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const {
    comprador, carro, modelo, fecha_compra, precio_auto,
    enganche = 0, monto_financiar, tasa_anual, plazo_meses, iva_interes = 0, dia_pago = 1,
    comprador_id = null,
  } = req.body;

  // Un vendedor solo puede crear créditos a su propio nombre; el admin puede
  // asignar cualquier vendedor (o dejarlo sin asignar).
  const vendedor_id = req.usuario.rol === 'vendedor' ? req.usuario.id : (req.body.vendedor_id || null);

  const { rows } = await pool.query(
    `INSERT INTO creditos
      (comprador, carro, modelo, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, vendedor_id, comprador_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [comprador, carro, modelo || null, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, vendedor_id, comprador_id, req.usuario.id]
  );

  const { rows: completo } = await pool.query(`${SELECT_CON_JOIN} WHERE c.id = $1`, [rows[0].id]);
  res.status(201).json(completo[0]);
}

async function actualizar(req, res) {
  const errorValidacion = validarCredito(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { rows: actual } = await pool.query('SELECT vendedor_id FROM creditos WHERE id = $1', [req.params.id]);
  if (!actual[0]) return res.status(404).json({ error: 'Crédito no encontrado.' });

  const {
    comprador, carro, modelo, fecha_compra, precio_auto,
    enganche = 0, monto_financiar, tasa_anual, plazo_meses, iva_interes = 0, dia_pago = 1, activo = true,
    comprador_id = null,
  } = req.body;

  // Un vendedor no puede reasignar el crédito a otro vendedor: se mantiene igual.
  // Solo el admin puede cambiar el vendedor asignado.
  const vendedor_id = req.usuario.rol === 'vendedor'
    ? actual[0].vendedor_id
    : (req.body.vendedor_id !== undefined ? req.body.vendedor_id || null : actual[0].vendedor_id);

  const { rows } = await pool.query(
    `UPDATE creditos SET
      comprador=$1, carro=$2, modelo=$3, fecha_compra=$4, precio_auto=$5,
      enganche=$6, monto_financiar=$7, tasa_anual=$8, plazo_meses=$9, iva_interes=$10, dia_pago=$11, activo=$12,
      vendedor_id=$13, comprador_id=$14
     WHERE id=$15
     RETURNING id`,
    [comprador, carro, modelo || null, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, activo, vendedor_id, comprador_id, req.params.id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Crédito no encontrado.' });
  const { rows: completo } = await pool.query(`${SELECT_CON_JOIN} WHERE c.id = $1`, [rows[0].id]);
  res.json(completo[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM creditos WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Crédito no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
