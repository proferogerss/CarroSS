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

function RutaProtegida({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RequiereCredito({ children }) {
  const { creditoId, cargando } = useCredito();

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }
  if (!creditoId) return <Navigate to="/credito" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/credito" element={<RutaProtegida><Credito /></RutaProtegida>} />

      <Route path="/" element={<RutaProtegida><RequiereCredito><Dashboard /></RequiereCredito></RutaProtegida>} />
      <Route path="/movimientos" element={<RutaProtegida><RequiereCredito><Movimientos /></RequiereCredito></RutaProtegida>} />
      <Route path="/amortizacion" element={<RutaProtegida><RequiereCredito><Amortizacion /></RequiereCredito></RutaProtegida>} />
      <Route path="/servicios" element={<RutaProtegida><RequiereCredito><Servicios /></RequiereCredito></RutaProtegida>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
