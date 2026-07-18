import React from 'react';

export default function ConfirmDialog({ abierto, titulo = '¿Estás seguro?', mensaje, onConfirmar, onCancelar }) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-500 mb-5">{mensaje}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg" onClick={onConfirmar}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
