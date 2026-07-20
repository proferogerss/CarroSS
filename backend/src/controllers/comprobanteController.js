const path = require('path');
const pool = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/uploadComprobante');

/**
 * Lista los comprobantes de un crédito (usado por el comprador para ver
 * el historial de lo que ha subido, y por admin/vendedor dentro del detalle
 * del crédito).
 */
async function listar(req, res) {
  const { rows } = await pool.query(
    `SELECT cp.*, u.nombre AS usuario_nombre
     FROM comprobantes_pago cp
     JOIN usuarios u ON u.id = cp.usuario_id
     WHERE cp.credito_id = $1
     ORDER BY cp.created_at DESC`,
    [req.params.creditoId]
  );
  res.json(rows);
}

/**
 * El comprador sube la foto de su comprobante para una semana específica.
 * Queda en estado "pendiente"; no modifica pagos_semanales todavía.
 */
async function subir(req, res) {
  const { pago_semanal_id, monto_reportado } = req.body;

  if (!pago_semanal_id) {
    return res.status(400).json({ error: 'pago_semanal_id es requerido.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La imagen del comprobante es requerida.' });
  }

  const { rows: semanaRows } = await pool.query(
    'SELECT id, pagado FROM pagos_semanales WHERE id = $1 AND credito_id = $2',
    [pago_semanal_id, req.params.creditoId]
  );
  if (!semanaRows[0]) {
    return res.status(404).json({ error: 'La semana indicada no pertenece a este crédito.' });
  }

  const { rows: pendienteExistente } = await pool.query(
    `SELECT id FROM comprobantes_pago WHERE pago_semanal_id = $1 AND estado = 'pendiente'`,
    [pago_semanal_id]
  );
  if (pendienteExistente[0]) {
    return res.status(400).json({ error: 'Ya hay un comprobante pendiente de revisión para esta semana.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO comprobantes_pago (credito_id, pago_semanal_id, usuario_id, imagen_path, monto_reportado, estado)
     VALUES ($1,$2,$3,$4,$5,'pendiente')
     RETURNING *`,
    [req.params.creditoId, pago_semanal_id, req.usuario.id, req.file.filename, monto_reportado || null]
  );
  res.status(201).json(rows[0]);
}

/**
 * Bandeja de pendientes para admin/vendedor. Admin ve todo; vendedor solo
 * los comprobantes de créditos que le pertenecen.
 */
async function pendientes(req, res) {
  const usuario = req.usuario;
  let query = `
    SELECT cp.*, c.carro, c.comprador, ps.numero_semana, ps.periodo, ps.fecha_programada, ps.monto_programado
    FROM comprobantes_pago cp
    JOIN creditos c ON c.id = cp.credito_id
    JOIN pagos_semanales ps ON ps.id = cp.pago_semanal_id
    WHERE cp.estado = 'pendiente'
  `;
  const params = [];
  if (usuario.rol === 'vendedor') {
    query += ' AND c.vendedor_id = $1';
    params.push(usuario.id);
  }
  query += ' ORDER BY cp.created_at ASC';

  const { rows } = await pool.query(query, params);
  res.json(rows);
}

/**
 * Aprueba el comprobante: marca la semana como pagada con el monto
 * confirmado (por default el que reportó el comprador, o el que corrija
 * quien revisa) y cierra el comprobante como "aprobado".
 */
async function aprobar(req, res) {
  const { rows: cpRows } = await pool.query('SELECT * FROM comprobantes_pago WHERE id = $1', [req.params.id]);
  const comprobante = cpRows[0];
  if (!comprobante) return res.status(404).json({ error: 'Comprobante no encontrado.' });
  if (comprobante.estado !== 'pendiente') {
    return res.status(400).json({ error: 'Este comprobante ya fue revisado.' });
  }

  const monto = req.body.monto_pagado !== undefined ? req.body.monto_pagado : comprobante.monto_reportado;

  await pool.query(
    'UPDATE pagos_semanales SET monto_pagado = $1, pagado = TRUE WHERE id = $2',
    [monto, comprobante.pago_semanal_id]
  );

  const { rows } = await pool.query(
    `UPDATE comprobantes_pago
     SET estado = 'aprobado', revisado_por = $1, revisado_at = NOW(), observaciones = $2
     WHERE id = $3
     RETURNING *`,
    [req.usuario.id, req.body.observaciones || null, req.params.id]
  );
  res.json(rows[0]);
}

/**
 * Rechaza el comprobante (foto ilegible, monto no corresponde, etc.).
 * No toca pagos_semanales; el comprador puede volver a subir uno nuevo.
 */
async function rechazar(req, res) {
  const { rows } = await pool.query(
    `UPDATE comprobantes_pago
     SET estado = 'rechazado', revisado_por = $1, revisado_at = NOW(), observaciones = $2
     WHERE id = $3 AND estado = 'pendiente'
     RETURNING *`,
    [req.usuario.id, req.body.observaciones || null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Comprobante no encontrado o ya revisado.' });
  res.json(rows[0]);
}

/**
 * Sirve el archivo de imagen de forma protegida (no está en una carpeta
 * pública). Comprador solo puede ver los suyos, vendedor solo los de sus
 * créditos, admin ve todos.
 */
async function verImagen(req, res) {
  const { rows } = await pool.query(
    'SELECT imagen_path, credito_id FROM comprobantes_pago WHERE id = $1',
    [req.params.id]
  );
  const comprobante = rows[0];
  if (!comprobante) return res.status(404).json({ error: 'Comprobante no encontrado.' });

  const usuario = req.usuario;
  if (usuario.rol !== 'admin') {
    const { rows: credRows } = await pool.query(
      'SELECT vendedor_id, comprador_id FROM creditos WHERE id = $1',
      [comprobante.credito_id]
    );
    const credito = credRows[0];
    const autorizado = usuario.rol === 'comprador'
      ? String(credito.comprador_id) === String(usuario.id)
      : String(credito.vendedor_id) === String(usuario.id);
    if (!autorizado) return res.status(403).json({ error: 'No tienes acceso a esta imagen.' });
  }

  res.sendFile(path.join(UPLOAD_DIR, comprobante.imagen_path));
}

module.exports = { listar, subir, pendientes, aprobar, rechazar, verImagen };
