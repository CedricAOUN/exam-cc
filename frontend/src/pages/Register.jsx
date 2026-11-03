// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../services/client';

/**
 * Registration form with client-side validation (empty fields, password length)
 * and clear success/error feedback.
 */
const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    const username = formData.username.trim();
    const email = formData.email.trim().toLowerCase();
    if (!username || !email || !formData.password) {
      setError('Renseignez tous les champs.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(username)) {
      setError(
        'Le nom d’utilisateur doit contenir 3 à 40 lettres, chiffres, tirets ou underscores.',
      );
      return;
    }
    if (formData.password.length < 12 || new TextEncoder().encode(formData.password).length > 72) {
      setError('Le mot de passe est trop court ou trop long.');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/auth/register', { ...formData, username, email });
      navigate('/login', {
        state: { message: 'Inscription réussie ! Vous pouvez maintenant vous connecter.' },
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Inscription impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">Inscription</h2>
        {error && (
          <p role="alert" className="text-red-500 mb-4">
            {error}
          </p>
        )}
        <input
          type="text"
          name="username"
          aria-label="Nom d’utilisateur"
          autoComplete="username"
          minLength={3}
          maxLength={40}
          required
          placeholder="Nom d'utilisateur"
          value={formData.username}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="email"
          name="email"
          aria-label="Adresse email"
          autoComplete="email"
          maxLength={254}
          required
          placeholder="Adresse email"
          value={formData.email}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <input
          type="password"
          name="password"
          aria-label="Mot de passe"
          autoComplete="new-password"
          placeholder="Mot de passe (12 caractères minimum)"
          minLength={12}
          maxLength={72}
          required
          value={formData.password}
          onChange={handleChange}
          className="border border-gray-300 p-2 w-full mb-4"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white p-2 w-full rounded"
        >
          S'inscrire
        </button>
      </form>
    </div>
  );
};

export default Register;
