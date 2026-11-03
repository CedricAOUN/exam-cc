// src/pages/Login.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const navigate = useNavigate();
  const { state } = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!credentials.username.trim() || !credentials.password) {
      setError('Renseignez votre nom d’utilisateur et votre mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ ...credentials, username: credentials.username.trim() });
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Connexion impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Connexion</h2>
        {state?.message && (
          <p role="status" className="mb-4">
            {state.message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-600 mb-4">
            {error}
          </p>
        )}
        <input
          type="text"
          aria-label="Nom d’utilisateur"
          name="username"
          autoComplete="username"
          maxLength={40}
          required
          placeholder="Nom d'utilisateur"
          value={credentials.username}
          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="password"
          aria-label="Mot de passe"
          name="password"
          autoComplete="current-password"
          maxLength={72}
          required
          placeholder="Mot de passe"
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white p-2 w-full rounded"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
};

export default Login;
