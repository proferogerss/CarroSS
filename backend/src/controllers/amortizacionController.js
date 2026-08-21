const ExcelJS = require('exceljs');
const pool = require('../config/db');
const { generarAmortizacion, compararEscenarios } = require('../utils/amortizacion');
const { calcularFechaPago } = require('../utils/fechas');

async function obtenerCreditoOrFail(creditoId, res) {
  const { rows } = await pool.query('SELECT * FROM creditos WHERE id = $1', [creditoId]);
  if (!rows[0]) {
    res.status(404).json({ error: 'Crédito no encontrado.' });
    return null;
  }
  return rows[0];
}

function paramsDeCredito(credito) {
  return {
    montoFinanciar: Number(credito.monto_financiar),
    tasaAnual: Number(credito.tasa_anual),
    plazoMeses: Number(credito.plazo_meses),
    ivaInteres: Number(credito.iva_interes),
  };
}

async function tablaAmortizacion(req, res) {
  const credito = await obtenerCreditoOrFail(req.params.creditoId, res);
  if (!credito) return;

  const [{ rows: eventos }, { rows: mensualidades }] = await Promise.all([
    pool.query('SELECT * FROM eventos_credito WHERE credito_id = $1', [req.params.creditoId]),
    pool.query('SELECT * FROM pagos_mensualidad WHERE credito_id = $1', [req.params.creditoId]),
  ]);

  const resultado = generarAmortizacion(paramsDeCredito(credito), eventos);
  const mensualidadPorMes = Object.fromEntries(mensualidades.map((m) => [m.mes, m]));

  resultado.tabla = resultado.tabla.map((fila) => ({
    ...fila,
    fechaProgramada: calcularFechaPago(credito.fecha_compra, credito.dia_pago, fila.mes),
    pagado: !!mensualidadPorMes[fila.mes]?.pagado,
    fechaPago: mensualidadPorMes[fila.mes]?.fecha_pago || null,
    montoPagado: mensualidadPorMes[fila.mes]?.monto_pagado || null,
  }));

  res.json({ credito, eventos, ...resultado });
}

async function simular(req, res) {
  const credito = await obtenerCreditoOrFail(req.params.creditoId, res);
  if (!credito) return;

  const { rows: eventosReales } = await pool.query(
    'SELECT * FROM eventos_credito WHERE credito_id = $1',
    [req.params.creditoId]
  );

  const eventosSimulados = Array.isArray(req.body.eventos) ? req.body.eventos : [];
  for (const ev of eventosSimulados) {
    if (!['pago_extra', 'seguro'].includes(ev.tipo) || !ev.mes || !ev.monto) {
      return res.status(400).json({ error: 'Cada evento simulado requiere tipo, mes y monto válidos.' });
    }
    if (ev.tipo === 'pago_extra' && ev.modo && !['plazo', 'mensualidad'].includes(ev.modo)) {
      return res.status(400).json({ error: `Modo inválido "${ev.modo}" en un evento pago_extra. Usa "plazo" o "mensualidad".` });
    }
  }

  // La simulación parte de los eventos ya reales/registrados + los hipotéticos que se están probando
  const comparativo = compararEscenarios(paramsDeCredito(credito), [...eventosReales, ...eventosSimulados]);
  res.json(comparativo);
}

async function listarMensualidades(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM pagos_mensualidad WHERE credito_id = $1 ORDER BY mes ASC',
    [req.params.creditoId]
  );
  res.json(rows);
}

async function actualizarMensualidad(req, res) {
  const { mes } = req.params;
  const { pagado, fecha_pago, monto_pagado, observaciones } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO pagos_mensualidad (credito_id, mes, pagado, fecha_pago, monto_pagado, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (credito_id, mes)
     DO UPDATE SET pagado=$3, fecha_pago=$4, monto_pagado=$5, observaciones=$6
     RETURNING *`,
    [req.params.creditoId, mes, !!pagado, fecha_pago || null, monto_pagado || null, observaciones || null]
  );

  res.json(rows[0]);
}

async function exportarExcel(req, res) {
  const credito = await obtenerCreditoOrFail(req.params.creditoId, res);
  if (!credito) return;

  const { rows: eventos } = await pool.query('SELECT * FROM eventos_credito WHERE credito_id = $1', [req.params.creditoId]);
  const resultado = generarAmortizacion(paramsDeCredito(credito), eventos);

  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet('Amortizacion');

  hoja.addRow(['Crédito Automotriz', credito.carro, credito.modelo]);
  hoja.addRow(['Comprador', credito.comprador]);
  hoja.addRow(['Monto a financiar', Number(credito.monto_financiar)]);
  hoja.addRow(['Tasa anual', Number(credito.tasa_anual)]);
  hoja.addRow(['Plazo original (meses)', credito.plazo_meses]);
  hoja.addRow(['Plazo real (meses)', resultado.plazoReal]);
  hoja.addRow(['Pago base mensual (original)', resultado.pagoBase]);
  if (resultado.pagoBaseFinal !== resultado.pagoBase) {
    hoja.addRow(['Mensualidad vigente (tras abonos en modo "mensualidad")', resultado.pagoBaseFinal]);
  }
  hoja.addRow([]);

  const encabezado = hoja.addRow([
    'Número de pago', 'Fecha de pago', 'Saldo inicial', 'Cargo seguro', 'Interés', 'IVA interés',
    'Capital', 'Abono extra', 'Modo abono extra', 'Mensualidad vigente ese mes', 'Capital total',
    'Pago total', 'Saldo final',
  ]);
  encabezado.font = { bold: true };

  for (const fila of resultado.tabla) {
    const fechaProgramada = calcularFechaPago(credito.fecha_compra, credito.dia_pago, fila.mes);
    hoja.addRow([
      fila.mes, fechaProgramada, fila.saldoInicial, fila.cargoSeguro, fila.interes, fila.ivaInteres,
      fila.capital, fila.abonoExtra, fila.modoAbonoExtra || '', fila.pagoBaseVigente, fila.capitalTotal,
      fila.pagoTotal, fila.saldoFinal,
    ]);
  }

  hoja.addRow([]);
  hoja.addRow([
    'Totales', '', '', '', resultado.totales.interes, resultado.totales.iva, resultado.totales.capital,
    resultado.totales.abonosExtra, '', '', '', resultado.totales.pagado, '',
  ]);

  hoja.columns.forEach((col) => { col.width = 16; });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="amortizacion_credito_${credito.id}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  tablaAmortizacion,
  simular,
  listarMensualidades,
  actualizarMensualidad,
  exportarExcel,
};
