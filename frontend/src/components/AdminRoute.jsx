// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AdminRoute = ({ children }) => {
  // fix : rôle lu dans la session renvoyée par le serveur, avant dans localstorage où chacun pouvait écrire "admin"
  const { isAdmin, loading } = useAuth();

  if (loading) return <p className="p-8 text-gray-600">Chargement...</p>;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
