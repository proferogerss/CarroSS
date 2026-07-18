import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatoMXN } from '../components/StatCard.jsx';
import api from '../api/client';
import { useCredito } from '../context/CreditoContext.jsx';

const PAGO_VACIO = { fecha: '', monto: '', observaciones: '' };
const PRESTAMO_VACIO = { fecha: '', concepto: '', monto: '', observaciones: '' };

export default function Movimientos() {
  const { creditoId } = useCredito();
  const [tab, setTab] = useState('pagos');

  const [pagos, setPagos] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [formPago, setFormPago] = useState(PAGO_VACIO);
  const [formPrestamo, setFormPrestamo] = useState(PRESTAMO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [aEliminar, setAEliminar] = useState(null); // { tipo, id }

  const cargar = useCallback(async () => {
    if (!creditoId) return;
    setCargando(true);
    const [{ data: p }, { data: pr }] = await Promise.all([
      api.get(`/creditos/${creditoId}/pagos`),
      api.get(`/creditos/${creditoId}/prestamos`),
    ]);
    setPagos(p);
    setPrestamos(pr);
    setCargando(false);
  }, [creditoId]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModal() {
    setError('');
    setFormPago(PAGO_VACIO);
    setFormPrestamo(PRESTAMO_VACIO);
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (tab === 'pagos') {
        await api.post(`/creditos/${creditoId}/pagos`, {
          ...formPago,
          monto: Number(formPago.monto),
        });
      } else {
        await api.post(`/creditos/${creditoId}/prestamos`, {
          ...formPrestamo,
          monto: Number(formPrestamo.monto),
        });
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    const { tipo, id } = aEliminar;
    await api.delete(`/${tipo}/${id}`);
    setAEliminar(null);
    await cargar();
  }

  const totalPagos = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const totalPrestamos = prestamos.reduce((s, p) => s + Number(p.monto), 0);

  return (
    <Layout
      titulo="Pagos y préstamos"
      acciones={<button className="btn-primary" onClick={abrirModal}>+ Agregar</button>}
    >
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('pagos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'pagos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          Pagos ({pagos.length})
        </button>
        <button
          onClick={() => setTab('prestamos')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'prestamos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          Préstamos ({prestamos.length})
        </button>
      </div>

      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : tab === 'pagos' ? (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha).toLocaleDateString('es-MX')}</td>
                  <td>{formatoMXN(p.monto)}</td>
                  <td>{p.observaciones || '—'}</td>
                  <td className="text-right">
                    <button className="btn-danger text-xs" onClick={() => setAEliminar({ tipo: 'pagos', id: p.id })}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {!pagos.length && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-6">Sin pagos registrados.</td></tr>
              )}
            </tbody>
            {!!pagos.length && (
              <tfoot>
                <tr>
                  <td className="font-semibold">Total</td>
                  <td className="font-semibold">{formatoMXN(totalPagos)}</td>
                  <td /><td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {prestamos.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.fecha).toLocaleDateString('es-MX')}</td>
                  <td>{p.concepto}</td>
                  <td>{formatoMXN(p.monto)}</td>
                  <td>{p.observaciones || '—'}</td>
                  <td className="text-right">
                    <button className="btn-danger text-xs" onClick={() => setAEliminar({ tipo: 'prestamos', id: p.id })}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {!prestamos.length && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6">Sin préstamos registrados.</td></tr>
              )}
            </tbody>
            {!!prestamos.length && (
              <tfoot>
                <tr>
                  <td className="font-semibold">Total</td>
                  <td /><td className="font-semibold">{formatoMXN(totalPrestamos)}</td>
                  <td /><td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={tab === 'pagos' ? 'Nuevo pago' : 'Nuevo préstamo'}>
        <form onSubmit={guardar} className="space-y-4">
          {tab === 'pagos' ? (
            <>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={formPago.fecha} onChange={(e) => setFormPago({ ...formPago, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="label">Monto</label>
                <input className="input" type="number" step="0.01" value={formPago.monto} onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })} required />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <input className="input" value={formPago.observaciones} onChange={(e) => setFormPago({ ...formPago, observaciones: e.target.value })} placeholder="Ej. Enganche, Licencia..." />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={formPrestamo.fecha} onChange={(e) => setFormPrestamo({ ...formPrestamo, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="label">Concepto</label>
                <input className="input" value={formPrestamo.concepto} onChange={(e) => setFormPrestamo({ ...formPrestamo, concepto: e.target.value })} required placeholder="Ej. Préstamo, Tarjetón..." />
              </div>
              <div>
                <label className="label">Monto</label>
                <input className="input" type="number" step="0.01" value={formPrestamo.monto} onChange={(e) => setFormPrestamo({ ...formPrestamo, monto: e.target.value })} required />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <input className="input" value={formPrestamo.observaciones} onChange={(e) => setFormPrestamo({ ...formPrestamo, observaciones: e.target.value })} />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!aEliminar}
        mensaje="Esta acción no se puede deshacer."
        onCancelar={() => setAEliminar(null)}
        onConfirmar={confirmarEliminar}
      />
    </Layout>
  );
}
