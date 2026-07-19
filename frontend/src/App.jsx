import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useCredito } from './context/CreditoContext.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Movimientos from './pages/Movimientos.jsx';
import Amortizacion from './pages/Amortizacion.jsx';
import Servicios from './pages/Servicios.jsx';
import Credito from './pages/Credito.jsx';
import Usuarios from './pages/Usuarios.jsx';

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RequiereRol({ roles, children }) {
  const { usuario } = useAuth();
  if (!roles.includes(usuario?.rol)) return <Navigate to="/" replace />;
  return children;
}

function SinCreditoAsignado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card max-w-sm text-center">
        <p className="text-lg font-semibold text-gray-700 mb-1">Aún no tienes un crédito asignado</p>
        <p className="text-sm text-gray-400">Contacta a tu vendedor para que lo vincule a tu cuenta.</p>
      </div>
    </div>
  );
}

function RequiereCredito({ children }) {
  const { creditoId, cargando } = useCredito();
  const { usuario } = useAuth();

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (!creditoId) {
    if (usuario?.rol === 'comprador') return <SinCreditoAsignado />;
    return <Navigate to="/credito" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/credito" element={
        <RutaProtegida><RequiereRol roles={['admin', 'vendedor']}><Credito /></RequiereRol></RutaProtegida>
      } />
      <Route path="/usuarios" element={
        <RutaProtegida><RequiereRol roles={['admin']}><Usuarios /></RequiereRol></RutaProtegida>
      } />
      <Route path="/movimientos" element={
        <RutaProtegida><RequiereRol roles={['admin', 'vendedor']}><RequiereCredito><Movimientos /></RequiereCredito></RequiereRol></RutaProtegida>
      } />

      <Route path="/" element={<RutaProtegida><RequiereCredito><Dashboard /></RequiereCredito></RutaProtegida>} />
      <Route path="/amortizacion" element={<RutaProtegida><RequiereCredito><Amortizacion /></RequiereCredito></RutaProtegida>} />
      <Route path="/servicios" element={<RutaProtegida><RequiereCredito><Servicios /></RequiereCredito></RutaProtegida>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
