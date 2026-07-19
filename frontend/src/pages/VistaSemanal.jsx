import React, { useEffect, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatoMXN, formatoFecha } from '../components/StatCard.jsx';
import api from '../api/client';

export default function VistaSemanal({ creditoId, onCambio, puedeEditar = true, puedeCrear = true }) {
  const [semanas, setSemanas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [recalculando, setRecalculando] = useState(null); // periodo en curso
  const [resultadoRecalculo, setResultadoRecalculo] = useState({}); // { [periodo]: resultado }

  const cargar = useCallback(async () => {
    if (!creditoId) return;
    setCargando(true);
    try {
      const { data } = await api.get(`/creditos/${creditoId}/semanas`);
      setSemanas(data);
    } finally {
      setCargando(false);
    }
  }, [creditoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function generar(e) {
    e.preventDefault();
    setError('');
    setGenerando(true);
    try {
      await api.post(`/creditos/${creditoId}/semanas/generar`, { fecha_inicio: fechaInicio });
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo generar el calendario.');
    } finally {
      setGenerando(false);
    }
  }

  function actualizarLocal(id, campo, valor) {
    setSemanas((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));
  }

  async function guardarSemana(fila, cambios) {
    if (!puedeEditar) return;
    await api.put(`/semanas/${fila.id}`, {
      monto_programado: cambios.monto_programado ?? fila.monto_programado,
      monto_pagado: cambios.monto_pagado !== undefined ? cambios.monto_pagado : fila.monto_pagado,
      pagado: cambios.pagado !== undefined ? cambios.pagado : fila.pagado,
      observaciones: fila.observaciones,
    });
  }

  async function togglePagado(fila) {
    if (!puedeEditar) return;
    const nuevo = !fila.pagado;
    actualizarLocal(fila.id, 'pagado', nuevo);
    await guardarSemana(fila, { pagado: nuevo });
  }

  async function recalcularPeriodo(periodo) {
    setRecalculando(periodo);
    try {
      const { data } = await api.post(`/creditos/${creditoId}/semanas/recalcular/${periodo}`);
      setResultadoRecalculo((prev) => ({ ...prev, [periodo]: data }));
      await cargar();
      onCambio?.(); // avisa al padre para refrescar la tabla mensual (los eventos cambiaron)
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo recalcular.');
    } finally {
      setRecalculando(null);
    }
  }

  async function eliminarCalendario() {
    await api.delete(`/creditos/${creditoId}/semanas`);
    setConfirmarEliminar(false);
    setSemanas([]);
    onCambio?.();
  }

  if (cargando) return <p className="text-gray-400">Cargando...</p>;

  if (!semanas.length) {
    if (!puedeCrear) {
      return <p className="text-gray-400">Aún no hay un calendario semanal configurado para este crédito.</p>;
    }
    return (
      <div className="card max-w-md">
        <p className="text-sm font-semibold text-gray-600 mb-1">Configurar pagos semanales</p>
        <p className="text-xs text-gray-400 mb-4">
          Elige la fecha del primer pago semanal. La mensualidad base se reparte entre 4 semanas por cada mes del crédito.
        </p>
        <form onSubmit={generar} className="space-y-3">
          <div>
            <label className="label">Fecha del primer pago</label>
            <input className="input" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={generando}>
            {generando ? 'Generando...' : 'Generar calendario semanal'}
          </button>
        </form>
      </div>
    );
  }

  const periodos = [...new Set(semanas.map((s) => s.periodo))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {puedeEditar && (
        <div className="flex justify-end">
          <button className="btn-danger text-xs" onClick={() => setConfirmarEliminar(true)}>Eliminar calendario semanal</button>
        </div>
      )}

      {periodos.map((periodo) => {
        const filas = semanas.filter((s) => s.periodo === periodo);
        const sumaProgramada = filas.reduce((s, f) => s + Number(f.monto_programado), 0);
        const sumaPagada = filas.reduce((s, f) => s + Number(f.monto_pagado || 0), 0);
        const resultado = resultadoRecalculo[periodo];

        return (
          <div key={periodo} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Mes {periodo}</p>
                <p className="text-xs text-gray-400">
                  Programado: {formatoMXN(sumaProgramada)} · Pagado: {formatoMXN(sumaPagada)}
                </p>
              </div>
              {puedeEditar && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => recalcularPeriodo(periodo)}
                  disabled={recalculando === periodo}
                >
                  {recalculando === periodo ? 'Recalculando...' : 'Recalcular este mes'}
                </button>
              )}
            </div>

            <table className="data-table w-full mb-2">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Fecha</th>
                  <th>Monto programado</th>
                  <th>Monto pagado</th>
                  <th>Pagado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className={fila.pagado ? 'bg-emerald-50/50' : ''}>
                    <td>{fila.numero_semana}</td>
                    <td>{formatoFecha(fila.fecha_programada)}</td>
                    <td>
                      <input
                        className="input py-1 disabled:opacity-60"
                        type="number"
                        step="0.01"
                        value={fila.monto_programado}
                        disabled={!puedeEditar}
                        onChange={(e) => actualizarLocal(fila.id, 'monto_programado', e.target.value)}
                        onBlur={(e) => guardarSemana(fila, { monto_programado: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        className="input py-1 disabled:opacity-60"
                        type="number"
                        step="0.01"
                        placeholder="—"
                        value={fila.monto_pagado ?? ''}
                        disabled={!puedeEditar}
                        onChange={(e) => actualizarLocal(fila.id, 'monto_pagado', e.target.value)}
                        onBlur={(e) => guardarSemana(fila, { monto_pagado: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input type="checkbox" checked={fila.pagado} disabled={!puedeEditar} onChange={() => togglePagado(fila)} className="w-4 h-4 accent-brand-600 disabled:opacity-50" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {resultado && (
              <div className="text-xs bg-brand-50 text-brand-700 rounded-lg px-3 py-2">
                Mensualidad base: {formatoMXN(resultado.pagoBase)} · Pagado en el mes: {formatoMXN(resultado.sumaPagada)} ·{' '}
                {resultado.diferencia > 0 ? (
                  <>Excedente aplicado como pago extra a capital: <strong>{formatoMXN(resultado.diferencia)}</strong></>
                ) : resultado.diferencia < 0 ? (
                  <span className="text-amber-600">{resultado.advertencia}</span>
                ) : (
                  <>Se pagó exactamente lo esperado, sin excedente.</>
                )}
              </div>
            )}
          </div>
        );
      })}

      <ConfirmDialog
        abierto={confirmarEliminar}
        mensaje="Se borrará todo el calendario semanal (incluyendo montos ya registrados). Los eventos de pago extra ya aplicados a la amortización NO se eliminan solos."
        onCancelar={() => setConfirmarEliminar(false)}
        onConfirmar={eliminarCalendario}
      />
    </div>
  );
}
