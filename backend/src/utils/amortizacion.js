/**
 * Motor de amortización de crédito automotriz.
 * Replica exactamente la lógica de las hojas "Amortizacion",
 * "Simulacion Pago Extra" y "Simulacion Seguro Financiado" del Excel original.
 *
 * Sistema francés (pago fijo capital + interés). La tasa mensual = tasa anual / 12.
 *
 * Eventos soportados (se aplican en un mes específico):
 *  - pago_extra: abono directo a capital. Se suma al capital normal de ese mes,
 *    manteniendo la mensualidad base igual en meses futuros -> el plazo se acorta.
 *  - seguro: cargo que se suma al saldo insoluto ANTES de calcular el interés de
 *    ese mes. La mensualidad base se mantiene igual -> el plazo se alarga.
 */

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Pago base mensual (anualidad) para un crédito con tasa fija.
 * P = C * r / (1 - (1+r)^-n)
 */
function calcularPagoBase(montoFinanciar, tasaMensual, plazoMeses) {
  if (tasaMensual === 0) return montoFinanciar / plazoMeses;
  const factor = 1 - Math.pow(1 + tasaMensual, -plazoMeses);
  return (montoFinanciar * tasaMensual) / factor;
}

/**
 * Genera la tabla de amortización completa aplicando los eventos indicados.
 *
 * @param {Object} params
 * @param {number} params.montoFinanciar
 * @param {number} params.tasaAnual        - fracción, ej. 0.30 para 30%
 * @param {number} params.plazoMeses
 * @param {number} [params.ivaInteres=0]   - fracción, ej. 0.16 para 16%
 * @param {Array}  eventos - [{ mes, tipo: 'pago_extra'|'seguro', monto }]
 */
function generarAmortizacion(params, eventos = []) {
  const { montoFinanciar, tasaAnual, plazoMeses, ivaInteres = 0 } = params;

  const tasaMensual = tasaAnual / 12;
  const pagoBase = calcularPagoBase(montoFinanciar, tasaMensual, plazoMeses);

  const eventosPorMes = {};
  for (const ev of eventos) {
    const mes = Number(ev.mes);
    if (!eventosPorMes[mes]) eventosPorMes[mes] = [];
    eventosPorMes[mes].push(ev);
  }

  const tabla = [];
  let saldo = montoFinanciar;
  let mes = 1;
  // Límite de seguridad: un seguro financiado puede alargar el crédito bastante,
  // pero nunca de forma indefinida.
  const maxMeses = plazoMeses * 3 + 36;

  let totalInteres = 0;
  let totalIva = 0;
  let totalCapital = 0;
  let totalPagado = 0;
  let totalSeguros = 0;
  let totalAbonosExtra = 0;

  while (saldo > 0.01 && mes <= maxMeses) {
    let saldoInicial = saldo;
    let cargoSeguro = 0;

    const evMes = eventosPorMes[mes] || [];
    const seguroEv = evMes.find((e) => e.tipo === 'seguro');
    if (seguroEv) {
      cargoSeguro = Number(seguroEv.monto);
      saldoInicial += cargoSeguro;
    }

    const interes = saldoInicial * tasaMensual;
    const ivaInt = interes * ivaInteres;

    let capitalNormal = pagoBase - interes;
    if (capitalNormal < 0) capitalNormal = 0;

    const extraEv = evMes.find((e) => e.tipo === 'pago_extra');
    const abonoExtra = extraEv ? Number(extraEv.monto) : 0;

    let capitalTotal = capitalNormal + abonoExtra;
    let pagoTotal = pagoBase + ivaInt + abonoExtra;

    // Último pago: si el capital calculado excede el saldo insoluto, se ajusta
    // para liquidar exactamente el saldo restante.
    if (capitalTotal >= saldoInicial) {
      capitalTotal = saldoInicial;
      pagoTotal = capitalTotal + interes + ivaInt;
    }

    const saldoFinal = Math.max(saldoInicial - capitalTotal, 0);

    tabla.push({
      mes,
      saldoInicial: round2(saldoInicial),
      cargoSeguro: round2(cargoSeguro),
      interes: round2(interes),
      ivaInteres: round2(ivaInt),
      capital: round2(capitalNormal),
      abonoExtra: round2(abonoExtra),
      capitalTotal: round2(capitalTotal),
      pagoTotal: round2(pagoTotal),
      saldoFinal: round2(saldoFinal),
    });

    totalInteres += interes;
    totalIva += ivaInt;
    totalCapital += capitalTotal;
    totalPagado += pagoTotal;
    totalSeguros += cargoSeguro;
    totalAbonosExtra += abonoExtra;

    saldo = saldoFinal;
    mes += 1;
  }

  return {
    pagoBase: round2(pagoBase),
    tasaMensual,
    plazoOriginal: plazoMeses,
    plazoReal: tabla.length,
    tabla,
    totales: {
      interes: round2(totalInteres),
      iva: round2(totalIva),
      capital: round2(totalCapital),
      pagado: round2(totalPagado),
      seguros: round2(totalSeguros),
      abonosExtra: round2(totalAbonosExtra),
    },
  };
}

/**
 * Compara el escenario base (sin eventos) contra un escenario con eventos aplicados.
 * Útil para el simulador (ahorro en intereses, meses que se adelanta/alarga, etc).
 */
function compararEscenarios(params, eventos) {
  const base = generarAmortizacion(params, []);
  const conEventos = generarAmortizacion(params, eventos);

  return {
    base,
    conEventos,
    comparativo: {
      plazoOriginal: base.plazoReal,
      plazoNuevo: conEventos.plazoReal,
      diferenciaMeses: base.plazoReal - conEventos.plazoReal,
      ahorroInteres: round2(base.totales.interes - conEventos.totales.interes),
      ahorroIva: round2(base.totales.iva - conEventos.totales.iva),
      ahorroTotal: round2(base.totales.pagado - conEventos.totales.pagado),
    },
  };
}

module.exports = {
  round2,
  calcularPagoBase,
  generarAmortizacion,
  compararEscenarios,
};
