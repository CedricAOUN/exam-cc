import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi } from 'vitest';
import { appRoutes } from './App';
import { CartProvider } from './context/CartContext';
import { fetchProducts } from './services/api';

vi.mock('./services/api', () => ({ fetchProducts: vi.fn(), createOrder: vi.fn() }));
vi.mock('./context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
function open(path, routes = appRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>,
  );
}
test.each(['/', '/products'])(
  'the catalogue is accessible at %s without logging in',
  async (path) => {
    fetchProducts.mockResolvedValue({
      data: [{ _id: 'p1', name: 'Test product', price: 10, stock: 1 }],
    });
    open(path);
    expect(await screen.findByText('Test product')).toBeInTheDocument();
  },
);
test('an empty catalogue is explained to the user', async () => {
  fetchProducts.mockResolvedValue({ data: [] });
  open('/products');
  expect(await screen.findByText('Aucun produit disponible pour le moment.')).toBeInTheDocument();
});
test.each([
  ['network failure', () => Promise.reject(new Error('offline'))],
  ['invalid response', () => Promise.resolve({ data: {} })],
])('%s shows a useful product loading error', async (_name, response) => {
  fetchProducts.mockImplementation(response);
  open('/products');
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les produits.');
});
test('unknown URLs use the custom 404 screen', async () => {
  open('/missing-page');
  expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voir les produits' })).toHaveAttribute(
    'href',
    '/products',
  );
});
test('unexpected route render errors show recovery controls without a stack trace', async () => {
  function BrokenPage() {
    throw new Error('sensitive internal details');
  }
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    open('/broken', [{ ...appRoutes[0], children: [{ path: 'broken', element: <BrokenPage /> }] }]);
    expect(
      await screen.findByRole('heading', { name: 'Impossible d’afficher cette page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.queryByText(/sensitive internal details/)).not.toBeInTheDocument();
  } finally {
    errorLog.mockRestore();
  }
});
