const pool = require('../config/db');

const TIPOS_VALIDOS = ['pago_extra', 'seguro'];

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM eventos_credito WHERE credito_id = $1 ORDER BY mes ASC, id ASC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function crear(req, res) {
  const { tipo, mes, monto, observaciones } = req.body;

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser "pago_extra" o "seguro".' });
  }
  if (!mes || Number(mes) < 1) {
    return res.status(400).json({ error: 'El mes debe ser un número mayor o igual a 1.' });
  }
  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO eventos_credito (credito_id, tipo, mes, monto, observaciones, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.creditoId, tipo, mes, monto, observaciones || null, req.usuario.id]
  );
  res.status(201).json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM eventos_credito WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Evento no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, crear, eliminar };
