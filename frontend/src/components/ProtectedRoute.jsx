// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
    // fix : session vérifiée par le serveur (cookie httponly), plus par un jeton en localstorage
    const { isAuthenticated, loading } = useAuth();

    // pas de redirection tant que la session n'est pas connue
    if (loading) return <p className="p-8 text-gray-600">Chargement...</p>;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

export default ProtectedRoute;
