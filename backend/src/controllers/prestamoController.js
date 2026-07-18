const pool = require('../config/db');

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM prestamos WHERE credito_id = $1 ORDER BY fecha DESC, id DESC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function crear(req, res) {
  const { fecha, concepto, monto, observaciones } = req.body;
  if (!fecha || !concepto || monto === undefined || monto === null || monto === '') {
    return res.status(400).json({ error: 'Fecha, concepto y monto son requeridos.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO prestamos (credito_id, fecha, concepto, monto, observaciones, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.creditoId, fecha, concepto, monto, observaciones || null, req.usuario.id]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { fecha, concepto, monto, observaciones } = req.body;
  if (!fecha || !concepto || monto === undefined || monto === null || monto === '') {
    return res.status(400).json({ error: 'Fecha, concepto y monto son requeridos.' });
  }

  const { rows } = await pool.query(
    `UPDATE prestamos SET fecha=$1, concepto=$2, monto=$3, observaciones=$4 WHERE id=$5 RETURNING *`,
    [fecha, concepto, monto, observaciones || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Préstamo no encontrado.' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM prestamos WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Préstamo no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
