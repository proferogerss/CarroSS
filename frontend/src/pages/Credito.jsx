import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api/client';
import { useCredito } from '../context/CreditoContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const VACIO = {
  comprador: '',
  carro: '',
  modelo: '',
  fecha_compra: '',
  precio_auto: '',
  enganche: '',
  monto_financiar: '',
  tasa_anual: '',
  plazo_meses: '',
  iva_interes: '',
  dia_pago: 1,
  vendedor_id: '',
  comprador_id: '',
};

export default function Credito() {
  const { creditos, creditoActual, creditoId, seleccionarCredito, recargar } = useCredito();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [pagoBaseEstimado, setPagoBaseEstimado] = useState(null);

  const [vendedores, setVendedores] = useState([]);
  const [compradorInfo, setCompradorInfo] = useState(null); // { id, nombre, email }
  const [cambiandoComprador, setCambiandoComprador] = useState(false);
  const [emailComprador, setEmailComprador] = useState('');
  const [buscandoComprador, setBuscandoComprador] = useState(false);
  const [errorComprador, setErrorComprador] = useState('');
  const [mostrarCrearComprador, setMostrarCrearComprador] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');

  useEffect(() => {
    if (usuario?.rol === 'admin') {
      api.get('/usuarios?rol=vendedor').then(({ data }) => setVendedores(data)).catch(() => {});
    }
  }, [usuario]);

  useEffect(() => {
    if (editandoId) return;
    if (creditoActual) {
      cargarParaEditar(creditoActual);
    } else if (creditoId) {
      api.get(`/creditos/${creditoId}`).then(({ data }) => cargarParaEditar(data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditoId, creditoActual]);

  useEffect(() => {
    const monto = Number(form.monto_financiar);
    const tasa = Number(form.tasa_anual);
    const plazo = Number(form.plazo_meses);
    if (monto > 0 && tasa >= 0 && plazo > 0) {
      const tasaMensual = tasa / 12;
      const pago = tasaMensual === 0
        ? monto / plazo
        : (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo));
      setPagoBaseEstimado(pago);
    } else {
      setPagoBaseEstimado(null);
    }
  }, [form.monto_financiar, form.tasa_anual, form.plazo_meses]);

  function cargarParaEditar(credito) {
    setEditandoId(credito.id);
    setForm({
      comprador: credito.comprador || '',
      carro: credito.carro || '',
      modelo: credito.modelo || '',
      fecha_compra: credito.fecha_compra?.slice(0, 10) || '',
      precio_auto: credito.precio_auto,
      enganche: credito.enganche,
      monto_financiar: credito.monto_financiar,
      tasa_anual: credito.tasa_anual,
      plazo_meses: credito.plazo_meses,
      iva_interes: credito.iva_interes,
      dia_pago: credito.dia_pago || 1,
      vendedor_id: credito.vendedor_id || '',
      comprador_id: credito.comprador_id || '',
    });
    setCompradorInfo(credito.comprador_id ? { id: credito.comprador_id, nombre: credito.comprador_nombre, email: credito.comprador_email } : null);
    setCambiandoComprador(false);
    setMostrarCrearComprador(false);
    setEmailComprador('');
  }

  function nuevoCredito() {
    setEditandoId(null);
    setForm(VACIO);
    setCompradorInfo(null);
    setCambiandoComprador(true);
  }

  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function buscarComprador() {
    setErrorComprador('');
    setMostrarCrearComprador(false);
    if (!emailComprador.trim()) {
      setErrorComprador('Escribe un correo para buscar.');
      return;
    }
    setBuscandoComprador(true);
    try {
      const { data } = await api.get(`/usuarios/buscar?email=${encodeURIComponent(emailComprador.trim())}`);
      setForm((f) => ({ ...f, comprador_id: data.id }));
      setCompradorInfo(data);
      setCambiandoComprador(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setMostrarCrearComprador(true);
      } else {
        setErrorComprador(err.response?.data?.error || 'No se pudo buscar el comprador.');
      }
    } finally {
      setBuscandoComprador(false);
    }
  }

  async function crearYAsignarComprador() {
    setErrorComprador('');
    if (!nuevoNombre.trim() || nuevoPassword.length < 6) {
      setErrorComprador('Nombre requerido y contraseña de al menos 6 caracteres.');
      return;
    }
    setBuscandoComprador(true);
    try {
      const { data } = await api.post('/usuarios', {
        nombre: nuevoNombre.trim(),
        email: emailComprador.trim(),
        password: nuevoPassword,
        rol: 'comprador',
      });
      setForm((f) => ({ ...f, comprador_id: data.id }));
      setCompradorInfo(data);
      setCambiandoComprador(false);
      setMostrarCrearComprador(false);
      setNuevoNombre('');
      setNuevoPassword('');
    } catch (err) {
      setErrorComprador(err.response?.data?.error || 'No se pudo crear el comprador.');
    } finally {
      setBuscandoComprador(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        ...form,
        precio_auto: Number(form.precio_auto),
        enganche: Number(form.enganche || 0),
        monto_financiar: Number(form.monto_financiar),
        tasa_anual: Number(form.tasa_anual),
        plazo_meses: Number(form.plazo_meses),
        iva_interes: Number(form.iva_interes || 0),
        dia_pago: Number(form.dia_pago),
        comprador_id: form.comprador_id || null,
      };
      if (usuario?.rol === 'admin') {
        payload.vendedor_id = form.vendedor_id || null;
      } else {
        delete payload.vendedor_id; // el vendedor siempre queda asignado a sí mismo (lo resuelve el backend)
      }

      let id = editandoId;
      if (editandoId) {
        await api.put(`/creditos/${editandoId}`, payload);
      } else {
        const { data } = await api.post('/creditos', payload);
        id = data.id;
      }

      await recargar();
      seleccionarCredito(id);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el crédito.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Layout titulo={editandoId ? 'Editar crédito' : 'Nuevo crédito'}>
      {creditos.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Créditos existentes:</span>
          {creditos.map((c) => (
            <button
              key={c.id}
              onClick={() => cargarParaEditar(c)}
              className={`text-xs px-3 py-1 rounded-full border ${
                editandoId === c.id ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.carro} ({c.comprador})
            </button>
          ))}
          <button onClick={nuevoCredito} className="text-xs px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50">
            + Nuevo
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Comprador</label>
            <input className="input" value={form.comprador} onChange={(e) => handleChange('comprador', e.target.value)} required />
          </div>
          <div>
            <label className="label">Fecha de compra</label>
            <input className="input" type="date" value={form.fecha_compra} onChange={(e) => handleChange('fecha_compra', e.target.value)} required />
          </div>
          <div>
            <label className="label">Carro</label>
            <input className="input" value={form.carro} onChange={(e) => handleChange('carro', e.target.value)} required placeholder="Ej. Renault Kwid" />
          </div>
          <div>
            <label className="label">Modelo (año)</label>
            <input className="input" value={form.modelo} onChange={(e) => handleChange('modelo', e.target.value)} placeholder="Ej. 2023" />
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Precio del auto</label>
            <input className="input" type="number" step="0.01" value={form.precio_auto} onChange={(e) => handleChange('precio_auto', e.target.value)} required />
          </div>
          <div>
            <label className="label">Enganche</label>
            <input className="input" type="number" step="0.01" value={form.enganche} onChange={(e) => handleChange('enganche', e.target.value)} />
          </div>
          <div>
            <label className="label">Monto a financiar</label>
            <input className="input" type="number" step="0.01" value={form.monto_financiar} onChange={(e) => handleChange('monto_financiar', e.target.value)} required />
          </div>
          <div>
            <label className="label">Plazo (meses)</label>
            <input className="input" type="number" value={form.plazo_meses} onChange={(e) => handleChange('plazo_meses', e.target.value)} required />
          </div>
          <div>
            <label className="label">Tasa anual (fracción, ej. 0.30 = 30%)</label>
            <input className="input" type="number" step="0.0001" value={form.tasa_anual} onChange={(e) => handleChange('tasa_anual', e.target.value)} required />
          </div>
          <div>
            <label className="label">IVA sobre intereses (fracción, ej. 0.16)</label>
            <input className="input" type="number" step="0.0001" value={form.iva_interes} onChange={(e) => handleChange('iva_interes', e.target.value)} />
          </div>
          <div>
            <label className="label">Día de pago mensual</label>
            <select className="input" value={form.dia_pago} onChange={(e) => handleChange('dia_pago', e.target.value)}>
              <option value={1}>Día 1</option>
              <option value={15}>Día 15</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">El primer pago cae el mes siguiente a la fecha de compra, en este día.</p>
          </div>
        </div>

        {pagoBaseEstimado !== null && (
          <div className="bg-brand-50 text-brand-700 rounded-lg px-4 py-3 text-sm">
            Mensualidad estimada: <strong>{pagoBaseEstimado.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong>
          </div>
        )}

        <hr className="border-gray-100" />

        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-600">Asignación</p>

          {usuario?.rol === 'admin' ? (
            <div>
              <label className="label">Vendedor asignado</label>
              <select className="input" value={form.vendedor_id} onChange={(e) => handleChange('vendedor_id', e.target.value)}>
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre} ({v.email})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Vendedor asignado</label>
              <p className="text-sm text-gray-600">Tú ({usuario?.nombre})</p>
            </div>
          )}

          <div>
            <label className="label">Comprador asignado</label>
            {compradorInfo && !cambiandoComprador ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">{compradorInfo.nombre}</p>
                  <p className="text-xs text-gray-400">{compradorInfo.email}</p>
                </div>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-800 font-medium" onClick={() => setCambiandoComprador(true)}>
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input"
                    type="email"
                    placeholder="Correo del comprador"
                    value={emailComprador}
                    onChange={(e) => setEmailComprador(e.target.value)}
                  />
                  <button type="button" className="btn-secondary whitespace-nowrap" onClick={buscarComprador} disabled={buscandoComprador}>
                    {buscandoComprador ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>

                {mostrarCrearComprador && (
                  <div className="bg-amber-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-amber-700">No existe un comprador con ese correo. Créalo:</p>
                    <input className="input" placeholder="Nombre completo" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
                    <input className="input" type="password" placeholder="Contraseña (mín. 6 caracteres)" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} />
                    <button type="button" className="btn-primary text-sm w-full" onClick={crearYAsignarComprador} disabled={buscandoComprador}>
                      {buscandoComprador ? 'Creando...' : 'Crear y asignar'}
                    </button>
                  </div>
                )}

                {errorComprador && <p className="text-xs text-red-600">{errorComprador}</p>}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          {creditoId && (
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Cancelar</button>
          )}
          <button type="submit" className="btn-primary" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar crédito'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
