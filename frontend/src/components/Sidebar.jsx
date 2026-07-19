import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: ['admin', 'vendedor', 'comprador'] },
  { to: '/movimientos', label: 'Pagos y préstamos', icon: '💵', roles: ['admin', 'vendedor'] },
  { to: '/amortizacion', label: 'Amortización', icon: '📅', roles: ['admin', 'vendedor', 'comprador'] },
  { to: '/servicios', label: 'Servicios', icon: '🔧', roles: ['admin', 'vendedor', 'comprador'] },
  { to: '/credito', label: 'Datos del crédito', icon: '🚗', roles: ['admin', 'vendedor'] },
  { to: '/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin'] },
];

const ETIQUETA_ROL = { admin: 'Administrador', vendedor: 'Vendedor', comprador: 'Comprador' };

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const visibles = links.filter((l) => l.roles.includes(usuario?.rol));

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-brand-700">CarroSS</h1>
        <p className="text-xs text-gray-400">Crédito automotriz</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {visibles.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <span>{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 truncate">{usuario?.nombre}</p>
        <p className="text-xs text-gray-400 truncate">{usuario?.email}</p>
        <p className="text-xs text-brand-600 font-medium mb-3">{ETIQUETA_ROL[usuario?.rol] || usuario?.rol}</p>
        <button onClick={logout} className="text-xs text-red-600 hover:text-red-800 font-medium">
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
