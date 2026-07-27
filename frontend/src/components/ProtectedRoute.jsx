import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from './UiStates';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { status, isAdmin } = useAuth();

  if (status === 'loading') {
    return <LoadingState label="Verificando sesión…" />;
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-md2 border border-danger-400/30 bg-danger-50 p-6 text-center">
        <p className="font-medium text-danger-600">No tienes permisos para ver esta sección.</p>
      </div>
    );
  }

  return children;
}
