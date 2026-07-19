import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext.jsx';

const PermisosContext = createContext(null);

export function PermisosProvider({ children }) {
  const { usuario } = useAuth();
  const [permisos, setPermisos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!usuario) {
      setPermisos(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const { data } = await api.get('/permisos');
      setPermisos(data);
    } catch (err) {
      console.error('No se pudo cargar la matriz de permisos:', err);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => { cargar(); }, [cargar]);

  function puedeVer(pantalla) {
    return !!permisos?.[pantalla]?.puede_ver;
  }
  function puedeCrear(pantalla) {
    return !!permisos?.[pantalla]?.puede_crear;
  }
  function puedeEditar(pantalla) {
    return !!permisos?.[pantalla]?.puede_editar;
  }

  return (
    <PermisosContext.Provider value={{ permisos, cargando, puedeVer, puedeCrear, puedeEditar, recargarPermisos: cargar }}>
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  const ctx = useContext(PermisosContext);
  if (!ctx) throw new Error('usePermisos debe usarse dentro de PermisosProvider');
  return ctx;
}
