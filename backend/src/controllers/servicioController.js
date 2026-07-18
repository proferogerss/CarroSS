const pool = require('../config/db');

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM servicios WHERE credito_id = $1 ORDER BY fecha DESC, id DESC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function crear(req, res) {
  const { fecha, kilometraje, precio, duracion_km, siguiente_km } = req.body;
  if (!fecha || kilometraje === undefined || precio === undefined || !duracion_km) {
    return res.status(400).json({ error: 'Fecha, kilometraje, precio y duración son requeridos.' });
  }

  const siguiente = siguiente_km !== undefined && siguiente_km !== null && siguiente_km !== ''
    ? siguiente_km
    : Number(kilometraje) + Number(duracion_km);

  const { rows } = await pool.query(
    `INSERT INTO servicios (credito_id, fecha, kilometraje, precio, duracion_km, siguiente_km, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.creditoId, fecha, kilometraje, precio, duracion_km, siguiente, req.usuario.id]
  );
  res.status(201).json(rows[0]);
}

async function actualizar(req, res) {
  const { fecha, kilometraje, precio, duracion_km, siguiente_km } = req.body;
  if (!fecha || kilometraje === undefined || precio === undefined || !duracion_km) {
    return res.status(400).json({ error: 'Fecha, kilometraje, precio y duración son requeridos.' });
  }

  const { rows } = await pool.query(
    `UPDATE servicios SET fecha=$1, kilometraje=$2, precio=$3, duracion_km=$4, siguiente_km=$5 WHERE id=$6 RETURNING *`,
    [fecha, kilometraje, precio, duracion_km, siguiente_km, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Servicio no encontrado.' });
  res.json(rows[0]);
}

async function eliminar(req, res) {
  const { rowCount } = await pool.query('DELETE FROM servicios WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Servicio no encontrado.' });
  res.status(204).send();
}

module.exports = { listar, crear, actualizar, eliminar };
