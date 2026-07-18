import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const CreditoContext = createContext(null);

export function CreditoProvider({ children }) {
  const [creditos, setCreditos] = useState([]);
  const [creditoId, setCreditoId] = useState(() => localStorage.getItem('carross_credito_id') || null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/creditos');
      setCreditos(data);
      setCreditoId((actual) => {
        const sigueExistiendo = data.some((c) => String(c.id) === String(actual));
        const siguiente = sigueExistiendo ? actual : (data[0]?.id ? String(data[0].id) : null);
        if (siguiente) localStorage.setItem('carross_credito_id', siguiente);
        return siguiente;
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  function seleccionarCredito(id) {
    setCreditoId(String(id));
    localStorage.setItem('carross_credito_id', String(id));
  }

  const creditoActual = creditos.find((c) => String(c.id) === String(creditoId)) || null;

  return (
    <CreditoContext.Provider value={{ creditos, creditoId, creditoActual, cargando, recargar, seleccionarCredito }}>
      {children}
    </CreditoContext.Provider>
  );
}

export function useCredito() {
  const ctx = useContext(CreditoContext);
  if (!ctx) throw new Error('useCredito debe usarse dentro de CreditoProvider');
  return ctx;
}
