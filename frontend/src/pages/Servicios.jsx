import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatoMXN, formatoFecha } from '../components/StatCard.jsx';
import api from '../api/client';
import { useCredito } from '../context/CreditoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const VACIO = { fecha: '', kilometraje: '', precio: '', duracion_km: '5000', siguiente_km: '' };

export default function Servicios() {
  const { creditoId } = useCredito();
  const { usuario } = useAuth();
  const puedeEditar = usuario?.rol !== 'comprador';
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(async () => {
    if (!creditoId) return;
    setCargando(true);
    const { data } = await api.get(`/creditos/${creditoId}/servicios`);
    setServicios(data);
    setCargando(false);
  }, [creditoId]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirModal() {
    setError('');
    setForm(VACIO);
    setModalAbierto(true);
  }

  function handleChange(campo, valor) {
    const nuevo = { ...form, [campo]: valor };
    if ((campo === 'kilometraje' || campo === 'duracion_km') && nuevo.kilometraje && nuevo.duracion_km) {
      nuevo.siguiente_km = Number(nuevo.kilometraje) + Number(nuevo.duracion_km);
    }
    setForm(nuevo);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api.post(`/creditos/${creditoId}/servicios`, {
        ...form,
        kilometraje: Number(form.kilometraje),
        precio: Number(form.precio),
        duracion_km: Number(form.duracion_km),
        siguiente_km: Number(form.siguiente_km),
      });
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el servicio.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    await api.delete(`/servicios/${aEliminar}`);
    setAEliminar(null);
    await cargar();
  }

  const totalGastado = servicios.reduce((s, x) => s + Number(x.precio), 0);

  return (
    <Layout titulo="Servicios y mantenimiento" acciones={puedeEditar ? <button className="btn-primary" onClick={abrirModal}>+ Registrar servicio</button> : null}>
      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Kilometraje</th>
                <th>Precio</th>
                <th>Duración (km)</th>
                <th>Siguiente servicio</th>
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.id}>
                  <td>{formatoFecha(s.fecha)}</td>
                  <td>{Number(s.kilometraje).toLocaleString('es-MX')} km</td>
                  <td>{formatoMXN(s.precio)}</td>
                  <td>{Number(s.duracion_km).toLocaleString('es-MX')} km</td>
                  <td className="font-medium">{Number(s.siguiente_km).toLocaleString('es-MX')} km</td>
                  {puedeEditar && (
                    <td className="text-right">
                      <button className="btn-danger text-xs" onClick={() => setAEliminar(s.id)}>Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
              {!servicios.length && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">Sin servicios registrados.</td></tr>
              )}
            </tbody>
            {!!servicios.length && (
              <tfoot>
                <tr>
                  <td className="font-semibold">Total gastado</td>
                  <td /><td className="font-semibold">{formatoMXN(totalGastado)}</td><td /><td />{puedeEditar && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo="Nuevo servicio">
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" value={form.fecha} onChange={(e) => handleChange('fecha', e.target.value)} required />
          </div>
          <div>
            <label className="label">Kilometraje al momento del servicio</label>
            <input className="input" type="number" value={form.kilometraje} onChange={(e) => handleChange('kilometraje', e.target.value)} required />
          </div>
          <div>
            <label className="label">Precio</label>
            <input className="input" type="number" step="0.01" value={form.precio} onChange={(e) => handleChange('precio', e.target.value)} required />
          </div>
          <div>
            <label className="label">Duración estimada (km)</label>
            <input className="input" type="number" value={form.duracion_km} onChange={(e) => handleChange('duracion_km', e.target.value)} required />
          </div>
          <div>
            <label className="label">Próximo servicio a los (km)</label>
            <input className="input" type="number" value={form.siguiente_km} onChange={(e) => handleChange('siguiente_km', e.target.value)} required />
          </div>

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
