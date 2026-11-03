// src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import useAuth from '../hooks/useAuth';

const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();

  // fix : état de connexion lu dans la session (cookie httponly), plus dans localstorage
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    // fix : la déconnexion efface aussi le cookie côté serveur
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-xl font-bold">Mon Application</Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Afficher le nom de l'utilisateur s'il est connecté */}
        {isAuthenticated && (
          <span className="font-semibold">
            Bonjour, {user.username}
          </span>
        )}

        {/* Lien vers le Panier avec le nombre d'articles */}
        <Link to="/cart" className="relative">
          <span>Panier</span>
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs px-2">
              {cart.length}
            </span>
          )}
        </Link>

        {/* fix : lien vers la page admin pour les administrateurs (avant, il fallait taper /admin) */}
        {isAdmin && <Link to="/admin">Administration</Link>}

        {/* fix : accès au suivi des commandes une fois connecté */}
        {isAuthenticated && <Link to="/mes-commandes">Mes commandes</Link>}

        {/* Lien Connexion / Déconnexion */}
        {!isAuthenticated ? (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        ) : (
          <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
