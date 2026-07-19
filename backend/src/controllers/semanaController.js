const pool = require('../config/db');
const { calcularPagoBase, round2 } = require('../utils/amortizacion');
const { generarFechasSemanales } = require('../utils/fechas');

const SEMANAS_POR_PERIODO = 4;

async function obtenerCreditoOrFail(creditoId, res) {
  const { rows } = await pool.query('SELECT * FROM creditos WHERE id = $1', [creditoId]);
  if (!rows[0]) {
    res.status(404).json({ error: 'Crédito no encontrado.' });
    return null;
  }
  return rows[0];
}

function pagoBaseDeCredito(credito) {
  const tasaMensual = Number(credito.tasa_anual) / 12;
  return calcularPagoBase(Number(credito.monto_financiar), tasaMensual, Number(credito.plazo_meses));
}

async function listar(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM pagos_semanales WHERE credito_id = $1 ORDER BY numero_semana ASC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function generar(req, res) {
  const credito = await obtenerCreditoOrFail(req.params.creditoId, res);
  if (!credito) return;

  const { fecha_inicio } = req.body;
  if (!fecha_inicio) {
    return res.status(400).json({ error: 'La fecha de inicio es requerida.' });
  }

  const { rows: existentes } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM pagos_semanales WHERE credito_id = $1',
    [req.params.creditoId]
  );
  if (existentes[0].total > 0) {
    return res.status(400).json({ error: 'Ya existe un calendario semanal para este crédito. Bórralo primero si quieres regenerarlo.' });
  }

  const pagoBase = pagoBaseDeCredito(credito);
  const montoPorSemana = round2(pagoBase / SEMANAS_POR_PERIODO);
  const totalSemanas = Number(credito.plazo_meses) * SEMANAS_POR_PERIODO;
  const fechas = generarFechasSemanales(fecha_inicio, totalSemanas);

  await pool.query('UPDATE creditos SET fecha_inicio_semanal = $1 WHERE id = $2', [fecha_inicio, req.params.creditoId]);

  const filas = [];
  for (let i = 0; i < totalSemanas; i++) {
    const numeroSemana = i + 1;
    const periodo = Math.floor(i / SEMANAS_POR_PERIODO) + 1;
    const esUltimaDelPeriodo = numeroSemana % SEMANAS_POR_PERIODO === 0;
    // La última semana del periodo absorbe el redondeo para que la suma cuadre exacto con pagoBase.
    const montoProgramado = esUltimaDelPeriodo
      ? round2(pagoBase - montoPorSemana * (SEMANAS_POR_PERIODO - 1))
      : montoPorSemana;

    filas.push({ numeroSemana, periodo, fecha: fechas[i], montoProgramado });
  }

  const values = [];
  const placeholders = filas.map((f, idx) => {
    const base = idx * 6;
    values.push(req.params.creditoId, f.numeroSemana, f.periodo, f.fecha, f.montoProgramado, req.usuario.id);
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`;
  });

  await pool.query(
    `INSERT INTO pagos_semanales (credito_id, numero_semana, periodo, fecha_programada, monto_programado, created_by)
     VALUES ${placeholders.join(',')}`,
    values
  );

  const { rows } = await pool.query(
    'SELECT * FROM pagos_semanales WHERE credito_id = $1 ORDER BY numero_semana ASC',
    [req.params.creditoId]
  );
  res.status(201).json(rows);
}

async function actualizar(req, res) {
  const { monto_programado, monto_pagado, pagado, fecha_programada, observaciones } = req.body;

  const { rows } = await pool.query(
    `UPDATE pagos_semanales SET
      monto_programado = COALESCE($1, monto_programado),
      monto_pagado = $2,
      pagado = $3,
      fecha_programada = COALESCE($4, fecha_programada),
      observaciones = $5
     WHERE id = $6
     RETURNING *`,
    [
      monto_programado !== undefined ? monto_programado : null,
      monto_pagado !== undefined ? monto_pagado : null,
      pagado !== undefined ? !!pagado : false,
      fecha_programada || null,
      observaciones || null,
      req.params.id,
    ]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Semana no encontrada.' });
  res.json(rows[0]);
}

async function eliminarCalendario(req, res) {
  await pool.query('DELETE FROM pagos_semanales WHERE credito_id = $1', [req.params.creditoId]);
  await pool.query('UPDATE creditos SET fecha_inicio_semanal = NULL WHERE id = $1', [req.params.creditoId]);
  res.status(204).send();
}

/**
 * Compara lo realmente pagado en las semanas de un periodo (mes) contra la
 * mensualidad base y, si hubo un excedente, lo registra como evento de
 * "pago extra a capital" (origen recalculo_semanal) para que la tabla de
 * amortización se recalcule con ese abono.
 */
async function recalcular(req, res) {
  const credito = await obtenerCreditoOrFail(req.params.creditoId, res);
  if (!credito) return;

  const periodo = Number(req.params.periodo);
  const pagoBase = round2(pagoBaseDeCredito(credito));

  const { rows: semanas } = await pool.query(
    'SELECT * FROM pagos_semanales WHERE credito_id = $1 AND periodo = $2 ORDER BY numero_semana ASC',
    [req.params.creditoId, periodo]
  );

  if (!semanas.length) {
    return res.status(404).json({ error: 'No hay semanas registradas para ese periodo.' });
  }

  const sumaPagada = round2(semanas.reduce((sum, s) => sum + Number(s.monto_pagado || 0), 0));
  const diferencia = round2(sumaPagada - pagoBase);

  await pool.query(
    `DELETE FROM eventos_credito WHERE credito_id = $1 AND mes = $2 AND tipo = 'pago_extra' AND origen = 'recalculo_semanal'`,
    [req.params.creditoId, periodo]
  );

  let eventoCreado = null;
  if (diferencia > 0.01) {
    const { rows } = await pool.query(
      `INSERT INTO eventos_credito (credito_id, tipo, mes, monto, observaciones, origen, created_by)
       VALUES ($1,'pago_extra',$2,$3,$4,'recalculo_semanal',$5)
       RETURNING *`,
      [req.params.creditoId, periodo, diferencia, `Excedente de pagos semanales del periodo ${periodo}`, req.usuario.id]
    );
    eventoCreado = rows[0];
  }

  // Marca como pagadas las semanas de este periodo que ya tienen un monto capturado.
  await pool.query(
    `UPDATE pagos_semanales SET pagado = TRUE WHERE credito_id = $1 AND periodo = $2 AND monto_pagado IS NOT NULL`,
    [req.params.creditoId, periodo]
  );

  res.json({
    periodo,
    pagoBase,
    sumaPagada,
    diferencia,
    eventoCreado,
    advertencia: diferencia < -0.01
      ? 'Se pagó menos de lo esperado en este periodo. El saldo no se ajusta automáticamente por faltantes, solo por excedentes.'
      : null,
  });
}

module.exports = { listar, generar, actualizar, eliminarCalendario, recalcular };
