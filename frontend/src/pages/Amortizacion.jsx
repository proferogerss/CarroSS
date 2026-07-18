import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatoMXN } from '../components/StatCard.jsx';
import api from '../api/client';
import { useCredito } from '../context/CreditoContext.jsx';

const EVENTO_VACIO = { tipo: 'pago_extra', mes: '', monto: '', observaciones: '' };

export default function Amortizacion() {
  const { creditoId } = useCredito();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalEvento, setModalEvento] = useState(false);
  const [formEvento, setFormEvento] = useState(EVENTO_VACIO);
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);

  const [modalSimulador, setModalSimulador] = useState(false);
  const [simTipo, setSimTipo] = useState('pago_extra');
  const [simMes, setSimMes] = useState('');
  const [simMonto, setSimMonto] = useState('');
  const [resultadoSim, setResultadoSim] = useState(null);
  const [simulando, setSimulando] = useState(false);

  const cargar = useCallback(async () => {
    if (!creditoId) return;
    setCargando(true);
    try {
      const { data } = await api.get(`/creditos/${creditoId}/amortizacion`);
      setDatos(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la tabla de amortización.');
    } finally {
      setCargando(false);
    }
  }, [creditoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function togglePagado(fila) {
    await api.put(`/creditos/${creditoId}/mensualidades/${fila.mes}`, {
      pagado: !fila.pagado,
      fecha_pago: !fila.pagado ? new Date().toISOString().slice(0, 10) : null,
      monto_pagado: !fila.pagado ? fila.pagoTotal : null,
    });
    await cargar();
  }

  async function guardarEvento(e) {
    e.preventDefault();
    setGuardandoEvento(true);
    try {
      await api.post(`/creditos/${creditoId}/eventos`, {
        ...formEvento,
        mes: Number(formEvento.mes),
        monto: Number(formEvento.monto),
      });
      setModalEvento(false);
      setFormEvento(EVENTO_VACIO);
      await cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo guardar el evento.');
    } finally {
      setGuardandoEvento(false);
    }
  }

  async function confirmarEliminarEvento() {
    await api.delete(`/eventos/${aEliminar}`);
    setAEliminar(null);
    await cargar();
  }

  async function correrSimulacion(e) {
    e.preventDefault();
    setSimulando(true);
    setResultadoSim(null);
    try {
      const { data } = await api.post(`/creditos/${creditoId}/simular`, {
        eventos: [{ tipo: simTipo, mes: Number(simMes), monto: Number(simMonto) }],
      });
      setResultadoSim(data);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo simular.');
    } finally {
      setSimulando(false);
    }
  }

  function exportarExcel() {
    const token = localStorage.getItem('carross_token');
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/creditos/${creditoId}/amortizacion/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amortizacion_credito_${creditoId}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (cargando) return <Layout titulo="Amortización"><p className="text-gray-400">Cargando...</p></Layout>;
  if (error) return <Layout titulo="Amortización"><p className="text-red-600">{error}</p></Layout>;
  if (!datos) return null;

  return (
    <Layout
      titulo="Tabla de amortización"
      acciones={
        <>
          <button className="btn-secondary" onClick={() => setModalSimulador(true)}>Simular escenario</button>
          <button className="btn-secondary" onClick={() => setModalEvento(true)}>+ Pago extra / Seguro</button>
          <button className="btn-primary" onClick={exportarExcel}>Exportar Excel</button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-400 uppercase font-semibold">Mensualidad base</p>
          <p className="text-xl font-bold">{formatoMXN(datos.pagoBase)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase font-semibold">Plazo</p>
          <p className="text-xl font-bold">{datos.plazoReal} meses</p>
          {datos.plazoReal !== datos.plazoOriginal && (
            <p className="text-xs text-gray-400">Original: {datos.plazoOriginal}</p>
          )}
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase font-semibold">Total intereses</p>
          <p className="text-xl font-bold text-red-600">{formatoMXN(datos.totales.interes)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase font-semibold">Total a pagar</p>
          <p className="text-xl font-bold">{formatoMXN(datos.totales.pagado)}</p>
        </div>
      </div>

      {!!datos.eventos.length && (
        <div className="card mb-6">
          <p className="text-sm font-semibold text-gray-600 mb-3">Eventos aplicados al crédito</p>
          <table className="data-table w-full">
            <thead>
              <tr><th>Tipo</th><th>Mes</th><th>Monto</th><th>Observaciones</th><th></th></tr>
            </thead>
            <tbody>
              {datos.eventos.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.tipo === 'pago_extra' ? 'Pago extra a capital' : 'Seguro financiado'}</td>
                  <td>{ev.mes}</td>
                  <td>{formatoMXN(ev.monto)}</td>
                  <td>{ev.observaciones || '—'}</td>
                  <td className="text-right"><button className="btn-danger text-xs" onClick={() => setAEliminar(ev.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Saldo inicial</th>
              <th>Seguro</th>
              <th>Interés</th>
              <th>IVA</th>
              <th>Capital</th>
              <th>Abono extra</th>
              <th>Pago total</th>
              <th>Saldo final</th>
              <th>Pagado</th>
            </tr>
          </thead>
          <tbody>
            {datos.tabla.map((fila) => (
              <tr key={fila.mes} className={fila.pagado ? 'bg-emerald-50/50' : ''}>
                <td>{fila.mes}</td>
                <td>{formatoMXN(fila.saldoInicial)}</td>
                <td>{fila.cargoSeguro ? formatoMXN(fila.cargoSeguro) : '—'}</td>
                <td>{formatoMXN(fila.interes)}</td>
                <td>{fila.ivaInteres ? formatoMXN(fila.ivaInteres) : '—'}</td>
                <td>{formatoMXN(fila.capital)}</td>
                <td>{fila.abonoExtra ? formatoMXN(fila.abonoExtra) : '—'}</td>
                <td className="font-medium">{formatoMXN(fila.pagoTotal)}</td>
                <td>{formatoMXN(fila.saldoFinal)}</td>
                <td>
                  <input type="checkbox" checked={fila.pagado} onChange={() => togglePagado(fila)} className="w-4 h-4 accent-brand-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: registrar evento real */}
      <Modal abierto={modalEvento} onClose={() => setModalEvento(false)} titulo="Registrar pago extra o seguro financiado">
        <form onSubmit={guardarEvento} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={formEvento.tipo} onChange={(e) => setFormEvento({ ...formEvento, tipo: e.target.value })}>
              <option value="pago_extra">Pago extra a capital (acorta el plazo)</option>
              <option value="seguro">Seguro financiado (alarga el plazo)</option>
            </select>
          </div>
          <div>
            <label className="label">Mes en que se aplica</label>
            <input className="input" type="number" min="1" value={formEvento.mes} onChange={(e) => setFormEvento({ ...formEvento, mes: e.target.value })} required />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" value={formEvento.monto} onChange={(e) => setFormEvento({ ...formEvento, monto: e.target.value })} required />
          </div>
          <div>
            <label className="label">Observaciones</label>
            <input className="input" value={formEvento.observaciones} onChange={(e) => setFormEvento({ ...formEvento, observaciones: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalEvento(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardandoEvento}>{guardandoEvento ? 'Guardando...' : 'Aplicar al crédito'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal: simulador (no persiste nada) */}
      <Modal abierto={modalSimulador} onClose={() => { setModalSimulador(false); setResultadoSim(null); }} titulo="Simular escenario">
        <form onSubmit={correrSimulacion} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={simTipo} onChange={(e) => setSimTipo(e.target.value)}>
              <option value="pago_extra">Pago extra a capital</option>
              <option value="seguro">Seguro financiado</option>
            </select>
          </div>
          <div>
            <label className="label">Mes en que se aplicaría</label>
            <input className="input" type="number" min="1" value={simMes} onChange={(e) => setSimMes(e.target.value)} required />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" value={simMonto} onChange={(e) => setSimMonto(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={simulando}>{simulando ? 'Calculando...' : 'Calcular'}</button>
        </form>

        {resultadoSim && (
          <div className="mt-5 pt-4 border-t border-gray-100 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sin este evento</p>
                <p>Plazo: <strong>{resultadoSim.comparativo.plazoOriginal} meses</strong></p>
              </div>
              <div className="bg-brand-50 rounded-lg p-3">
                <p className="text-xs text-brand-500 uppercase font-semibold mb-1">Con este evento</p>
                <p>Plazo: <strong>{resultadoSim.comparativo.plazoNuevo} meses</strong></p>
              </div>
            </div>
            <p>
              {resultadoSim.comparativo.diferenciaMeses >= 0
                ? <>El crédito se adelanta <strong>{resultadoSim.comparativo.diferenciaMeses} meses</strong>.</>
                : <>El crédito se alarga <strong>{Math.abs(resultadoSim.comparativo.diferenciaMeses)} meses</strong>.</>}
            </p>
            <p>Ahorro en intereses: <strong className={resultadoSim.comparativo.ahorroInteres >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatoMXN(resultadoSim.comparativo.ahorroInteres)}</strong></p>
            <p>Ahorro total (con IVA): <strong className={resultadoSim.comparativo.ahorroTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatoMXN(resultadoSim.comparativo.ahorroTotal)}</strong></p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={!!aEliminar}
        mensaje="Se eliminará este evento y la tabla de amortización se recalculará."
        onCancelar={() => setAEliminar(null)}
        onConfirmar={confirmarEliminarEvento}
      />
    </Layout>
  );
}
