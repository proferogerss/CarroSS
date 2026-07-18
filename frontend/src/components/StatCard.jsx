import React from 'react';

export function formatoMXN(valor) {
  const n = Number(valor || 0);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
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
