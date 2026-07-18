import React from 'react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ children, titulo, acciones }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
          <div className="flex gap-2">{acciones}</div>
        </div>
        {children}
      </main>
    </div>
  );
}
