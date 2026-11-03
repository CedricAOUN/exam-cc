import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { useAuth } from './context/AuthContext';
vi.mock('./context/AuthContext', () => ({ useAuth: vi.fn() }));
test('protected content waits for session verification', () => {
  useAuth.mockReturnValue({ user: null, loading: true });
  render(
    <MemoryRouter>
      <ProtectedRoute>
        <p>Private order</p>
      </ProtectedRoute>
    </MemoryRouter>,
  );
  expect(screen.getByText('Chargement...')).toBeInTheDocument();
  expect(screen.queryByText('Private order')).not.toBeInTheDocument();
});
test('ordinary users cannot see admin content even with forged localStorage', () => {
  localStorage.setItem('role', 'admin');
  useAuth.mockReturnValue({ user: { role: 'user' }, loading: false });
  render(
    <MemoryRouter>
      <AdminRoute>
        <p>Admin orders</p>
      </AdminRoute>
    </MemoryRouter>,
  );
  expect(screen.queryByText('Admin orders')).not.toBeInTheDocument();
  localStorage.clear();
});
test('verified administrators can see admin content', () => {
  useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
  render(
    <MemoryRouter>
      <AdminRoute>
        <p>Admin orders</p>
      </AdminRoute>
    </MemoryRouter>,
  );
  expect(screen.getByText('Admin orders')).toBeInTheDocument();
});
