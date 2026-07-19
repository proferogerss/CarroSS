const pool = require('../config/db');

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
  const { rows } = await pool.query(
    'SELECT * FROM creditos ORDER BY activo DESC, created_at DESC'
  );
  res.json(rows);
}

async function obtener(req, res) {
  const { rows } = await pool.query('SELECT * FROM creditos WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Crédito no encontrado.' });
  res.json(rows[0]);
}

async function crear(req, res) {
  const errorValidacion = validarCredito(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const {
    comprador, carro, modelo, fecha_compra, precio_auto,
    enganche = 0, monto_financiar, tasa_anual, plazo_meses, iva_interes = 0, dia_pago = 1,
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO creditos
      (comprador, carro, modelo, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [comprador, carro, modelo || null, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, req.usuario.id]
  );

  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const errorValidacion = validarCredito(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const {
    comprador, carro, modelo, fecha_compra, precio_auto,
    enganche = 0, monto_financiar, tasa_anual, plazo_meses, iva_interes = 0, dia_pago = 1, activo = true,
  } = req.body;

  const { rows } = await pool.query(
    `UPDATE creditos SET
      comprador=$1, carro=$2, modelo=$3, fecha_compra=$4, precio_auto=$5,
      enganche=$6, monto_financiar=$7, tasa_anual=$8, plazo_meses=$9, iva_interes=$10, dia_pago=$11, activo=$12
     WHERE id=$13
     RETURNING *`,
    [comprador, carro, modelo || null, fecha_compra, precio_auto, enganche, monto_financiar, tasa_anual, plazo_meses, iva_interes, dia_pago, activo, req.params.id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Crédito no encontrado.' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM creditos WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Crédito no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
