// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { cart, dispatch } = useCart();
  const { user, logout } = useAuth();
  const isAuthenticated = Boolean(user);
  const username = user?.username;

  const cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const handleLogout = async () => {
    try {
      await logout();
      dispatch({ type: 'RESET_CART' });
      navigate('/login');
    } catch {
      alert('Déconnexion impossible. Réessayez.');
    }
  };

  return (
    <nav className="bg-blue-500 text-white p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-xl font-bold">
          Mon Application
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Afficher le nom de l'utilisateur s'il est connecté */}
        {isAuthenticated && <span className="font-semibold">Bonjour, {username}</span>}

        {/* Lien vers le Panier avec le nombre d'articles */}
        <Link to="/cart" className="relative">
          <span>Panier</span>
          {cartQuantity > 0 && (
            <span className="bg-red-500 text-white rounded-full text-xs ml-1 px-2">
              {cartQuantity}
            </span>
          )}
        </Link>

        {user?.role === 'admin' && <Link to="/admin">Administration</Link>}
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
