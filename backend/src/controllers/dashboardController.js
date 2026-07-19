const pool = require('../config/db');
const { generarAmortizacion, round2 } = require('../utils/amortizacion');
const { calcularFechaPago } = require('../utils/fechas');

async function resumen(req, res) {
  const creditoId = req.params.creditoId;

  const { rows: creditoRows } = await pool.query('SELECT * FROM creditos WHERE id = $1', [creditoId]);
  const credito = creditoRows[0];
  if (!credito) return res.status(404).json({ error: 'Crédito no encontrado.' });

  const [
    { rows: eventos },
    { rows: mensualidades },
    { rows: pagos },
    { rows: prestamos },
    { rows: servicios },
  ] = await Promise.all([
    pool.query('SELECT * FROM eventos_credito WHERE credito_id = $1', [creditoId]),
    pool.query('SELECT * FROM pagos_mensualidad WHERE credito_id = $1 ORDER BY mes ASC', [creditoId]),
    pool.query('SELECT * FROM pagos WHERE credito_id = $1', [creditoId]),
    pool.query('SELECT * FROM prestamos WHERE credito_id = $1', [creditoId]),
    pool.query('SELECT * FROM servicios WHERE credito_id = $1 ORDER BY fecha DESC', [creditoId]),
  ]);

  const resultado = generarAmortizacion(
    {
      montoFinanciar: Number(credito.monto_financiar),
      tasaAnual: Number(credito.tasa_anual),
      plazoMeses: Number(credito.plazo_meses),
      ivaInteres: Number(credito.iva_interes),
    },
    eventos
  );

  const mensualidadesPagadas = mensualidades.filter((m) => m.pagado);
  const mesesPagados = mensualidadesPagadas.map((m) => m.mes);
  const mesActual = mesesPagados.length ? Math.max(...mesesPagados) : 0;

  const filaActual = mesActual > 0 ? resultado.tabla.find((f) => f.mes === mesActual) : null;
  const saldoActual = filaActual ? filaActual.saldoFinal : Number(credito.monto_financiar);

  const proximaFilaBase = resultado.tabla.find((f) => f.mes === mesActual + 1) || null;
  const proximaFila = proximaFilaBase
    ? { ...proximaFilaBase, fechaProgramada: calcularFechaPago(credito.fecha_compra, credito.dia_pago, proximaFilaBase.mes) }
    : null;

  const totalPagosIniciales = round2(pagos.reduce((sum, p) => sum + Number(p.monto), 0));
  const totalPrestamos = round2(prestamos.reduce((sum, p) => sum + Number(p.monto), 0));
  const totalMensualidadesPagadas = round2(
    mensualidadesPagadas.reduce((sum, m) => sum + Number(m.monto_pagado || 0), 0)
  );

  const ultimoServicio = servicios[0] || null;

  res.json({
    credito,
    resumenAmortizacion: {
      pagoBase: resultado.pagoBase,
      plazoOriginal: resultado.plazoOriginal,
      plazoReal: resultado.plazoReal,
      totalIntereses: resultado.totales.interes,
      totalAPagar: resultado.totales.pagado,
      saldoActual: round2(saldoActual),
      mesesPagados: mesActual,
      mesesRestantes: Math.max(resultado.plazoReal - mesActual, 0),
      proximoPago: proximaFila,
    },
    finanzas: {
      totalPagosIniciales,
      totalPrestamos,
      totalMensualidadesPagadas,
      totalGeneralAportado: round2(totalPagosIniciales + totalMensualidadesPagadas - totalPrestamos),
    },
    servicios: {
      ultimoServicio,
      totalServicios: servicios.length,
      totalGastadoServicios: round2(servicios.reduce((sum, s) => sum + Number(s.precio), 0)),
    },
    eventos,
  });
}

module.exports = { resumen };
