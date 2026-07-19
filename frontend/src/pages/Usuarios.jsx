import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import api from '../api/client';

const VACIO = { nombre: '', email: '', password: '', rol: 'comprador', activo: true };
const ETIQUETA_ROL = { admin: 'Administrador', vendedor: 'Vendedor', comprador: 'Comprador' };
const COLOR_ROL = { admin: 'bg-brand-50 text-brand-700', vendedor: 'bg-amber-50 text-amber-700', comprador: 'bg-emerald-50 text-emerald-700' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await api.get('/usuarios');
    setUsuarios(data);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditandoId(null);
    setForm(VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(u) {
    setEditandoId(u.id);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo });
    setError('');
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = { ...form };
      if (editandoId && !payload.password) delete payload.password;

      if (editandoId) {
        await api.put(`/usuarios/${editandoId}`, payload);
      } else {
        await api.post('/usuarios', payload);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el usuario.');
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(u) {
    await api.put(`/usuarios/${u.id}`, { nombre: u.nombre, email: u.email, rol: u.rol, activo: !u.activo });
    await cargar();
  }

  return (
    <Layout titulo="Usuarios" acciones={<button className="btn-primary" onClick={abrirNuevo}>+ Nuevo usuario</button>}>
      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${COLOR_ROL[u.rol]}`}>{ETIQUETA_ROL[u.rol] || u.rol}</span></td>
                  <td>
                    <button
                      onClick={() => toggleActivo(u)}
                      className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="text-right">
                    <button className="text-xs text-brand-600 hover:text-brand-800 font-medium" onClick={() => abrirEditar(u)}>Editar</button>
                  </td>
                </tr>
              ))}
              {!usuarios.length && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6">Sin usuarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={modalAbierto} onClose={() => setModalAbierto(false)} titulo={editandoId ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="admin">Administrador</option>
              <option value="vendedor">Vendedor</option>
              <option value="comprador">Comprador</option>
            </select>
          </div>
          <div>
            <label className="label">{editandoId ? 'Nueva contraseña (dejar en blanco para no cambiarla)' : 'Contraseña'}</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editandoId}
              minLength={6}
            />
          </div>
          {editandoId && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="w-4 h-4 accent-brand-600" />
              Usuario activo
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
