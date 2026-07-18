import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const raw = localStorage.getItem('carross_usuario');
    return raw ? JSON.parse(raw) : null;
  });
  const [cargando, setCargando] = useState(false);

  const login = useCallback(async (email, password) => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('carross_token', data.token);
      localStorage.setItem('carross_usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'No se pudo iniciar sesión.' };
    } finally {
      setCargando(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('carross_token');
    localStorage.removeItem('carross_usuario');
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
