import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api/client';
import { usePermisos } from '../context/PermisosContext.jsx';

export default function RolesPermisos() {
  const { recargarPermisos } = usePermisos();
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [matriz, setMatriz] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    api.get('/admin/roles').then(({ data }) => {
      const editables = data.filter((r) => r.clave !== 'admin');
      setRoles(editables);
      if (editables[0]) setRolSeleccionado(editables[0].clave);
    });
  }, []);

  const cargarMatriz = useCallback(async () => {
    if (!rolSeleccionado) return;
    setCargando(true);
    setMensaje('');
    const { data } = await api.get(`/admin/permisos/${rolSeleccionado}`);
    setMatriz(data);
    setCargando(false);
  }, [rolSeleccionado]);

  useEffect(() => { cargarMatriz(); }, [cargarMatriz]);

  function togglePermiso(pantallaClave, campo) {
    setMatriz((prev) => prev.map((p) => {
      if (p.pantalla_clave !== pantallaClave) return p;
      const actualizado = { ...p, [campo]: !p[campo] };
      // Si se apaga "Ver", no tiene sentido dejar Crear/Editar prendidos.
      if (campo === 'puede_ver' && !actualizado.puede_ver) {
        actualizado.puede_crear = false;
        actualizado.puede_editar = false;
      }
      return actualizado;
    }));
  }

  async function guardar() {
    setGuardando(true);
    setMensaje('');
    try {
      const { data } = await api.put(`/admin/permisos/${rolSeleccionado}`, { permisos: matriz });
      setMatriz(data);
      setMensaje('Permisos guardados.');
      await recargarPermisos();
    } catch (err) {
      setMensaje(err.response?.data?.error || 'No se pudieron guardar los permisos.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout titulo="Roles y permisos">
      <div className="mb-6 flex items-center gap-3">
        <label className="label mb-0">Rol</label>
        <select className="input max-w-xs" value={rolSeleccionado} onChange={(e) => setRolSeleccionado(e.target.value)}>
          {roles.map((r) => (
            <option key={r.clave} value={r.clave}>{r.nombre}</option>
          ))}
        </select>
        <button className="btn-primary ml-auto" onClick={guardar} disabled={guardando || cargando}>
          {guardando ? 'Guardando...' : 'Guardar permisos'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        El Administrador siempre tiene acceso total y no aparece aquí. "Ver" controla si la pantalla aparece en el menú;
        "Crear" y "Editar" solo aplican si "Ver" está activo.
      </p>

      {mensaje && <p className="text-sm text-brand-600 mb-4">{mensaje}</p>}

      {cargando ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Pantalla</th>
                <th className="text-center">Ver</th>
                <th className="text-center">Crear</th>
                <th className="text-center">Editar</th>
              </tr>
            </thead>
            <tbody>
              {matriz.map((p) => (
                <tr key={p.pantalla_clave}>
                  <td className="font-medium">{p.pantalla_nombre}</td>
                  <td className="text-center">
                    <input type="checkbox" checked={p.puede_ver} onChange={() => togglePermiso(p.pantalla_clave, 'puede_ver')} className="w-4 h-4 accent-brand-600" />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={p.puede_crear} disabled={!p.puede_ver} onChange={() => togglePermiso(p.pantalla_clave, 'puede_crear')} className="w-4 h-4 accent-emerald-600 disabled:opacity-30" />
                  </td>
                  <td className="text-center">
                    <input type="checkbox" checked={p.puede_editar} disabled={!p.puede_ver} onChange={() => togglePermiso(p.pantalla_clave, 'puede_editar')} className="w-4 h-4 accent-amber-600 disabled:opacity-30" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
