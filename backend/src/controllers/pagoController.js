const pool = require('../config/db');

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM pagos WHERE credito_id = $1 ORDER BY fecha DESC, id DESC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function crear(req, res) {
  const { fecha, monto, observaciones } = req.body;
  if (!fecha || monto === undefined || monto === null || monto === '') {
    return res.status(400).json({ error: 'Fecha y monto son requeridos.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO pagos (credito_id, fecha, monto, observaciones, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.params.creditoId, fecha, monto, observaciones || null, req.usuario.id]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { fecha, monto, observaciones } = req.body;
  if (!fecha || monto === undefined || monto === null || monto === '') {
    return res.status(400).json({ error: 'Fecha y monto son requeridos.' });
  }

  const { rows } = await pool.query(
    `UPDATE pagos SET fecha=$1, monto=$2, observaciones=$3 WHERE id=$4 RETURNING *`,
    [fecha, monto, observaciones || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Pago no encontrado.' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM pagos WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Pago no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
