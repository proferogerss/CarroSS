import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Layout from '../components/Layout.jsx';
import StatCard, { formatoMXN } from '../components/StatCard.jsx';
import api from '../api/client';
import { useCredito } from '../context/CreditoContext.jsx';

const COLORES = ['#2f7dff', '#e2e8f0'];

export default function Dashboard() {
  const { creditoId } = useCredito();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!creditoId) return;
    setCargando(true);
    api.get(`/dashboard/${creditoId}`)
      .then(({ data }) => setDatos(data))
      .catch((err) => setError(err.response?.data?.error || 'No se pudo cargar el dashboard.'))
      .finally(() => setCargando(false));
  }, [creditoId]);

  if (cargando) {
    return <Layout titulo="Dashboard"><p className="text-gray-400">Cargando...</p></Layout>;
  }
  if (error) {
    return <Layout titulo="Dashboard"><p className="text-red-600">{error}</p></Layout>;
  }
  if (!datos) return null;

  const { credito, resumenAmortizacion: r, finanzas, servicios } = datos;

  const dataPie = [
    { name: 'Capital pagado', value: Math.max(Number(credito.monto_financiar) - r.saldoActual, 0) },
    { name: 'Saldo pendiente', value: Math.max(r.saldoActual, 0) },
  ];

  return (
    <Layout
      titulo={`${credito.carro}${credito.modelo ? ' · ' + credito.modelo : ''}`}
      acciones={
        <Link to="/credito" className="btn-secondary text-sm">Editar crédito</Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard etiqueta="Saldo actual" valor={formatoMXN(r.saldoActual)} tono="brand" subtexto={`de ${formatoMXN(credito.monto_financiar)} financiados`} />
        <StatCard
          etiqueta="Próxima mensualidad"
          valor={r.proximoPago ? formatoMXN(r.proximoPago.pagoTotal) : '—'}
          subtexto={
            r.proximoPago
              ? `Pago ${r.proximoPago.mes} de ${r.plazoReal} · ${new Date(`${r.proximoPago.fechaProgramada}T00:00:00`).toLocaleDateString('es-MX')}`
              : 'Crédito liquidado'
          }
          tono="warn"
        />
        <StatCard etiqueta="Meses pagados" valor={`${r.mesesPagados} / ${r.plazoReal}`} subtexto={`${r.mesesRestantes} meses restantes`} />
        <StatCard etiqueta="Mensualidad base" valor={formatoMXN(r.pagoBase)} subtexto="Capital + interés" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard etiqueta="Total intereses proyectados" valor={formatoMXN(r.totalIntereses)} tono="bad" />
        <StatCard etiqueta="Total a pagar (crédito)" valor={formatoMXN(r.totalAPagar)} />
        <StatCard etiqueta="Pagos + préstamos + mensualidades" valor={formatoMXN(finanzas.totalGeneralAportado)} tono="good" />
        <StatCard etiqueta="Gastado en servicios" valor={formatoMXN(servicios.totalGastadoServicios)} subtexto={`${servicios.totalServicios} servicios registrados`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-1">
          <p className="text-sm font-semibold text-gray-600 mb-3">Avance del crédito</p>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dataPie} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {dataPie.map((_, i) => <Cell key={i} fill={COLORES[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatoMXN(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card md:col-span-2">
          <p className="text-sm font-semibold text-gray-600 mb-3">Resumen financiero</p>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-gray-500">Pagos iniciales (enganche, licencia, etc.)</dt>
            <dd className="text-right font-medium">{formatoMXN(finanzas.totalPagosIniciales)}</dd>
            <dt className="text-gray-500">Préstamos / adelantos</dt>
            <dd className="text-right font-medium">{formatoMXN(finanzas.totalPrestamos)}</dd>
            <dt className="text-gray-500">Mensualidades pagadas</dt>
            <dd className="text-right font-medium">{formatoMXN(finanzas.totalMensualidadesPagadas)}</dd>
            <dt className="text-gray-500 font-semibold">Total aportado</dt>
            <dd className="text-right font-bold">{formatoMXN(finanzas.totalGeneralAportado)}</dd>
          </dl>

          {servicios.ultimoServicio && (
            <div className="mt-5 pt-4 border-t border-gray-100 text-sm">
              <p className="text-gray-500">
                Último servicio: <strong>{servicios.ultimoServicio.kilometraje.toLocaleString('es-MX')} km</strong> el {new Date(servicios.ultimoServicio.fecha).toLocaleDateString('es-MX')}.
                {' '}Siguiente sugerido a los <strong>{servicios.ultimoServicio.siguiente_km.toLocaleString('es-MX')} km</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
