import { createContext, useContext, useEffect, useState } from 'react';
import client from '../services/client';
const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    // Remove credentials left by the previous localStorage implementation.
    for (const key of ['token', 'role', 'username']) localStorage.removeItem(key);
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    client
      .get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch((error) => {
        if (active && error.response?.status !== 401)
          setError('Impossible de vérifier la connexion. Réessayez.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.removeEventListener('session-expired', expired);
    };
  }, []);
  const login = async (credentials) => {
    const { data } = await client.post('/auth/login', credentials);
    setUser(data.user);
    setError('');
  };
  const logout = async () => {
    try {
      await client.post('/auth/logout');
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
