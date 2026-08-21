import React, { useEffect, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { formatoMXN, formatoFecha } from '../components/StatCard.jsx';
import api from '../api/client';

const ESTADO_BADGE = {
  pendiente: { texto: 'En revisión', clase: 'bg-amber-50 text-amber-600' },
  aprobado: { texto: 'Aprobado', clase: 'bg-emerald-50 text-emerald-600' },
  rechazado: { texto: 'Rechazado', clase: 'bg-red-50 text-red-600' },
};

const MODOS_RECALCULO = [
  { valor: 'plazo', etiqueta: 'Reducir plazo', ayuda: 'Mensualidad igual, el crédito termina antes.' },
  { valor: 'mensualidad', etiqueta: 'Reducir mensualidad', ayuda: 'Plazo igual, baja el pago de los meses que faltan.' },
];

export default function VistaSemanal({ creditoId, onCambio, puedeEditar = true, puedeCrear = true }) {
  const [semanas, setSemanas] = useState([]);
  const [comprobantesPorSemana, setComprobantesPorSemana] = useState({}); // { [pago_semanal_id]: comprobante }
  const [cargando, setCargando] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [recalculando, setRecalculando] = useState(null); // periodo en curso
  const [resultadoRecalculo, setResultadoRecalculo] = useState({}); // { [periodo]: resultado }
  const [modoRecalculo, setModoRecalculo] = useState('plazo'); // 'plazo' | 'mensualidad' — qué se aplica al recalcular

  // Revisión de comprobante (modal)
  const [comprobanteActivo, setComprobanteActivo] = useState(null);
  const [imagenUrl, setImagenUrl] = useState(null);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [montoRevision, setMontoRevision] = useState('');
  const [observacionesRevision, setObservacionesRevision] = useState('');
  const [guardandoRevision, setGuardandoRevision] = useState(false);

  const cargar = useCallback(async () => {
    if (!creditoId) return;
    setCargando(true);
    try {
      const [{ data: semanasData }, { data: comprobantesData }] = await Promise.all([
        api.get(`/creditos/${creditoId}/semanas`),
        api.get(`/creditos/${creditoId}/comprobantes`),
      ]);
      setSemanas(semanasData);

      // La API regresa los comprobantes ordenados por created_at DESC, así que
      // el primero que encontremos por semana es el más reciente.
      const mapa = {};
      for (const c of comprobantesData) {
        if (!mapa[c.pago_semanal_id]) mapa[c.pago_semanal_id] = c;
      }
      setComprobantesPorSemana(mapa);
    } finally {
      setCargando(false);
    }
  }, [creditoId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Libera el object URL de la imagen al cerrar el modal o desmontar, para no dejar memoria colgada.
  useEffect(() => {
    return () => { if (imagenUrl) URL.revokeObjectURL(imagenUrl); };
  }, [imagenUrl]);

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
      const { data } = await api.post(`/creditos/${creditoId}/semanas/recalcular/${periodo}`, { modo: modoRecalculo });
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

  async function abrirRevision(comprobante) {
    setComprobanteActivo(comprobante);
    setMontoRevision(comprobante.monto_reportado ?? '');
    setObservacionesRevision('');
    setImagenUrl(null);
    setCargandoImagen(true);
    try {
      const { data } = await api.get(`/comprobantes/${comprobante.id}/imagen`, { responseType: 'blob' });
      setImagenUrl(URL.createObjectURL(data));
    } catch (err) {
      alert('No se pudo cargar la imagen del comprobante.');
    } finally {
      setCargandoImagen(false);
    }
  }

  function cerrarRevision() {
    setComprobanteActivo(null);
    setImagenUrl(null);
  }

  async function aprobarComprobante() {
    setGuardandoRevision(true);
    try {
      await api.put(`/comprobantes/${comprobanteActivo.id}/aprobar`, {
        monto_pagado: montoRevision === '' ? undefined : Number(montoRevision),
        observaciones: observacionesRevision || undefined,
      });
      cerrarRevision();
      await cargar();
      onCambio?.();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo aprobar el comprobante.');
    } finally {
      setGuardandoRevision(false);
    }
  }

  async function rechazarComprobante() {
    setGuardandoRevision(true);
    try {
      await api.put(`/comprobantes/${comprobanteActivo.id}/rechazar`, {
        observaciones: observacionesRevision || undefined,
      });
      cerrarRevision();
      await cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo rechazar el comprobante.');
    } finally {
      setGuardandoRevision(false);
    }
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

      {puedeEditar && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Al recalcular un excedente, aplicarlo como:</p>
            <p className="text-xs text-gray-400">
              Siempre se calculan las dos opciones; esta es la que queda registrada en la amortización real.
            </p>
          </div>
          <div className="flex gap-2">
            {MODOS_RECALCULO.map((m) => (
              <button
                key={m.valor}
                type="button"
                title={m.ayuda}
                className={`btn-secondary text-xs ${modoRecalculo === m.valor ? 'ring-2 ring-brand-500 bg-brand-50' : ''}`}
                onClick={() => setModoRecalculo(m.valor)}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
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
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const comprobante = comprobantesPorSemana[fila.id];
                  const badge = comprobante ? ESTADO_BADGE[comprobante.estado] : null;
                  return (
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
                      <td>
                        {!comprobante ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.clase}`}>{badge.texto}</span>
                            {puedeEditar && (
                              <button className="btn-secondary text-xs" onClick={() => abrirRevision(comprobante)}>
                                {comprobante.estado === 'pendiente' ? 'Revisar' : 'Ver'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {resultado && (
              <div className="text-xs bg-brand-50 text-brand-700 rounded-lg px-3 py-2 space-y-2">
                <p>
                  Mensualidad base: {formatoMXN(resultado.pagoBase)} · Pagado en el mes: {formatoMXN(resultado.sumaPagada)} ·{' '}
                  {resultado.diferencia > 0 ? (
                    <>Excedente: <strong>{formatoMXN(resultado.diferencia)}</strong></>
                  ) : resultado.diferencia < 0 ? (
                    <span className="text-amber-600">{resultado.advertencia}</span>
                  ) : (
                    <>Se pagó exactamente lo esperado, sin excedente.</>
                  )}
                </p>

                {resultado.comparativo && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className={`rounded-lg px-2.5 py-2 ${resultado.modoAplicado === 'plazo' ? 'bg-brand-100 ring-1 ring-brand-400' : 'bg-white'}`}>
                      <p className="font-semibold">
                        Reducir plazo {resultado.modoAplicado === 'plazo' && <span className="text-brand-600">(aplicado)</span>}
                      </p>
                      <p>Mensualidad: {formatoMXN(resultado.comparativo.plazo.mensualidad)}</p>
                      <p>Plazo nuevo: {resultado.comparativo.plazo.plazoNuevo} meses ({resultado.comparativo.plazo.mesesQueSeAdelanta} menos)</p>
                    </div>
                    <div className={`rounded-lg px-2.5 py-2 ${resultado.modoAplicado === 'mensualidad' ? 'bg-brand-100 ring-1 ring-brand-400' : 'bg-white'}`}>
                      <p className="font-semibold">
                        Reducir mensualidad {resultado.modoAplicado === 'mensualidad' && <span className="text-brand-600">(aplicado)</span>}
                      </p>
                      <p>Mensualidad nueva: {formatoMXN(resultado.comparativo.mensualidad.mensualidad)}</p>
                      <p>Plazo: {resultado.comparativo.mensualidad.plazoNuevo} meses</p>
                    </div>
                  </div>
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

      <Modal abierto={!!comprobanteActivo} onClose={cerrarRevision} titulo={`Comprobante — Semana ${comprobanteActivo?.numero_semana ?? ''}`}>
        {comprobanteActivo && (
          <div className="space-y-4">
            {cargandoImagen ? (
              <p className="text-gray-400 text-sm">Cargando imagen...</p>
            ) : imagenUrl ? (
              <img src={imagenUrl} alt="Comprobante de pago" className="w-full rounded-lg border border-gray-200 max-h-96 object-contain bg-gray-50" />
            ) : (
              <p className="text-red-600 text-sm">No se pudo cargar la imagen.</p>
            )}

            <p className="text-xs text-gray-400">
              Subido por {comprobanteActivo.usuario_nombre} el {formatoFecha(comprobanteActivo.created_at)}
            </p>

            {comprobanteActivo.estado === 'pendiente' ? (
              <>
                <div>
                  <label className="label">Monto a registrar como pagado</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={montoRevision}
                    onChange={(e) => setMontoRevision(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    El comprador reportó {comprobanteActivo.monto_reportado ? formatoMXN(comprobanteActivo.monto_reportado) : 'sin monto'}. Puedes corregirlo antes de aprobar.
                  </p>
                </div>
                <div>
                  <label className="label">Observaciones (opcional)</label>
                  <input className="input" value={observacionesRevision} onChange={(e) => setObservacionesRevision(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn-danger" onClick={rechazarComprobante} disabled={guardandoRevision}>
                    {guardandoRevision ? 'Guardando...' : 'Rechazar'}
                  </button>
                  <button type="button" className="btn-primary" onClick={aprobarComprobante} disabled={guardandoRevision}>
                    {guardandoRevision ? 'Guardando...' : 'Aprobar y marcar pagada'}
                  </button>
                </div>
              </>
            ) : (
              <div className={`text-sm rounded-lg px-3 py-2 ${comprobanteActivo.estado === 'aprobado' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {comprobanteActivo.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                {comprobanteActivo.observaciones ? ` — ${comprobanteActivo.observaciones}` : ''}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
