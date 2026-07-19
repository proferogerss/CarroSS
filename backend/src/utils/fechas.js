/**
 * Calcula la fecha programada del pago número `numeroPago` (1-indexado).
 *
 * Regla de negocio: el primer pago cae el mes SIGUIENTE a la fecha de compra,
 * en el día seleccionado (1 o 15). Cada pago posterior se recorre un mes más.
 *
 * Ej. fecha_compra = 2026-07-17, dia_pago = 1  -> pago 1 = 2026-08-01, pago 2 = 2026-09-01, ...
 * Ej. fecha_compra = 2026-07-17, dia_pago = 15 -> pago 1 = 2026-08-15, pago 2 = 2026-09-15, ...
 *
 * @param {Date|string} fechaCompra
 * @param {number} diaPago - 1 o 15
 * @param {number} numeroPago - 1, 2, 3, ...
 * @returns {string} fecha en formato YYYY-MM-DD
 */
function calcularFechaPago(fechaCompra, diaPago, numeroPago) {
  const base = typeof fechaCompra === 'string' ? new Date(`${fechaCompra}T00:00:00Z`) : fechaCompra;

  const anio = base.getUTCFullYear();
  const mesBase = base.getUTCMonth();

  const fecha = new Date(Date.UTC(anio, mesBase + numeroPago, diaPago));
  return fecha.toISOString().slice(0, 10);
}

module.exports = { calcularFechaPago };
