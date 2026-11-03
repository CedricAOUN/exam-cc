import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './pages/Login';
import Register from './pages/Register';
import ShippingPayment from './pages/ShippingPayment';
import Order from './pages/Order';
import { CartProvider, useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import client from './services/client';
import { createOrder } from './services/api';

vi.mock('./context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./services/client', () => ({ default: { post: vi.fn() } }));
vi.mock('./services/api', () => ({ createOrder: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
});
function openAccountPage(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<p>Catalogue</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
test('empty login fields are required and do not trigger an API request', async () => {
  const login = vi.fn();
  useAuth.mockReturnValue({ login });
  openAccountPage('/login');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  expect(screen.getByLabelText('Nom d’utilisateur')).toBeInvalid();
  expect(screen.getByLabelText('Mot de passe')).toBeInvalid();
  expect(login).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Renseignez');
});
test('login displays rejected credentials and permits retry', async () => {
  const login = vi
    .fn()
    .mockRejectedValueOnce({ response: { data: { message: 'Identifiants invalides.' } } })
    .mockResolvedValueOnce({});
  useAuth.mockReturnValue({ login });
  openAccountPage('/login');
  await userEvent.type(screen.getByLabelText('Nom d’utilisateur'), 'tester');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Identifiants invalides.');
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
  expect(await screen.findByText('Catalogue')).toBeInTheDocument();
});
test('empty registration is blocked; a successful normalized registration has visible feedback', async () => {
  client.post.mockResolvedValue({});
  useAuth.mockReturnValue({ login: vi.fn() });
  openAccountPage('/register');
  await userEvent.click(screen.getByRole('button', { name: /S.inscrire/ }));
  expect(screen.getByLabelText('Nom d’utilisateur')).toBeInvalid();
  expect(client.post).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText('Nom d’utilisateur'), 'tester');
  await userEvent.type(screen.getByLabelText('Adresse email'), 'TEST@EXAMPLE.COM');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'A-long-password-123');
  await userEvent.click(screen.getByRole('button', { name: /S.inscrire/ }));
  expect(await screen.findByRole('status')).toHaveTextContent('Inscription réussie');
  expect(client.post).toHaveBeenCalledWith('/auth/register', {
    username: 'tester',
    email: 'test@example.com',
    password: 'A-long-password-123',
  });
});
test('duplicate registration errors are inline, escaped and do not submit twice while pending', async () => {
  let reject;
  client.post.mockImplementation(
    () =>
      new Promise((_resolve, rejectPromise) => {
        reject = rejectPromise;
      }),
  );
  openAccountPage('/register');
  await userEvent.type(screen.getByLabelText('Nom d’utilisateur'), 'tester');
  await userEvent.type(screen.getByLabelText('Adresse email'), 'test@example.com');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'A-long-password-123');
  const button = screen.getByRole('button', { name: /S.inscrire/ });
  await userEvent.click(button);
  await userEvent.click(button);
  expect(client.post).toHaveBeenCalledTimes(1);
  const message = '<img src=x onerror="alert(\'test\')">';
  reject({ response: { data: { message } } });
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(document.querySelector('img')).toBeNull();
  await waitFor(() => expect(button).toBeEnabled());
});
function CheckoutStart() {
  const { dispatch } = useCart();
  return (
    <>
      <button
        onClick={() =>
          dispatch({
            type: 'ADD_TO_CART',
            payload: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Test product', price: 10, stock: 3 },
          })
        }
      >
        Ajouter un produit test
      </button>
      <ShippingPayment />
    </>
  );
}
function openCheckout() {
  render(
    <CartProvider>
      <MemoryRouter initialEntries={['/shipping-payment']}>
        <Routes>
          <Route path="/shipping-payment" element={<CheckoutStart />} />
          <Route path="/order" element={<Order />} />
        </Routes>
      </MemoryRouter>
    </CartProvider>,
  );
}
async function fillAddress(street = '1 Test') {
  await userEvent.type(screen.getByLabelText('Rue'), street);
  await userEvent.type(screen.getByLabelText('Ville'), ' Paris ');
  await userEvent.type(screen.getByLabelText('Code Postal'), '75001');
  await userEvent.type(screen.getByLabelText('Pays'), 'France');
}
test('shipping rejects empty and whitespace-only addresses before opening the summary', async () => {
  openCheckout();
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter un produit test' }));
  await userEvent.click(screen.getByRole('button', { name: 'Passer une commande' }));
  expect(screen.getByLabelText('Rue')).toBeInvalid();
  await fillAddress('   ');
  await userEvent.click(screen.getByRole('button', { name: 'Passer une commande' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Renseignez tous les champs');
  expect(screen.queryByText('Synthèse de la commande')).not.toBeInTheDocument();
  expect(createOrder).not.toHaveBeenCalled();
});
test('shipping rejects an empty cart even with a complete address', async () => {
  openCheckout();
  await fillAddress();
  await userEvent.click(screen.getByRole('button', { name: 'Passer une commande' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Votre panier est vide');
});
test('checkout preserves cart on failure, escapes HTML, retains retry key and clears cart on success', async () => {
  const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  try {
    createOrder
      .mockRejectedValueOnce({ response: { data: { message: 'Stock insuffisant.' } } })
      .mockResolvedValueOnce({ data: {} });
    openCheckout();
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un produit test' }));
    const injection = "<script>alert('test')</script>";
    await fillAddress(injection);
    await userEvent.selectOptions(screen.getByLabelText('Mode de paiement:'), 'PayPal');
    await userEvent.selectOptions(screen.getByLabelText('Méthode de livraison:'), 'chronopost');
    await userEvent.click(screen.getByRole('button', { name: 'Passer une commande' }));
    expect(await screen.findByText(injection)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('75001 Paris')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la commande' }));
    expect(alert).toHaveBeenCalledWith('Stock insuffisant.');
    expect(screen.getByText('Test product')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer la commande' }));
    expect(await screen.findByText('Votre panier est vide.')).toBeInTheDocument();
    const [body, key] = createOrder.mock.calls[0];
    expect(body).toEqual({
      items: [{ productId: 'aaaaaaaaaaaaaaaaaaaaaaaa', quantity: 1 }],
      shippingAddress: { street: injection, city: 'Paris', postalCode: '75001', country: 'France' },
      paymentMethod: 'PayPal',
      shippingMethod: 'chronopost',
    });
    expect(key).toMatch(/^[a-f0-9]{32}$/);
    expect(createOrder.mock.calls[1][1]).toBe(key);
    expect(alert).toHaveBeenLastCalledWith('Commande confirmée avec succès !');
  } finally {
    alert.mockRestore();
  }
});
