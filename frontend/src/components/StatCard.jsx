import React from 'react';

export function formatoMXN(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

// Acepta tanto "YYYY-MM-DD" (fechas calculadas en el backend) como el ISO
// completo con hora que devuelve Postgres para columnas DATE
// ("YYYY-MM-DDT00:00:00.000Z"). Siempre se queda solo con la parte de fecha
// y la interpreta en hora local para evitar que se recorra un día.
export function formatoFecha(valor) {
  if (!valor) return '—';
  const soloFecha = String(valor).slice(0, 10);
  return new Date(`${soloFecha}T00:00:00`).toLocaleDateString('es-MX');
}

export default function StatCard({ etiqueta, valor, subtexto, tono = 'default' }) {
  const tonos = {
    default: 'text-gray-900',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-red-600',
    brand: 'text-brand-600',
  };

  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{etiqueta}</p>
      <p className={`text-2xl font-bold ${tonos[tono]}`}>{valor}</p>
      {subtexto && <p className="text-xs text-gray-400 mt-1">{subtexto}</p>}
    </div>
  );
}
