import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Cart from './pages/Cart';
import { CartProvider, useCart } from './context/CartContext';
function Shop() {
  const { dispatch } = useCart();
  return (
    <>
      <button
        onClick={() =>
          dispatch({
            type: 'ADD_TO_CART',
            payload: { id: 'p1', name: 'Test product', price: 10, stock: 3 },
          })
        }
      >
        Ajouter
      </button>
      <Cart />
    </>
  );
}
test('cart add, increment, decrement, removal and clearing update the visible cart', async () => {
  render(
    <CartProvider>
      <MemoryRouter>
        <Shop />
      </MemoryRouter>
    </CartProvider>,
  );
  expect(screen.getByText('Votre panier est vide')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  expect(screen.getByText('Test product')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '+' }));
  expect(screen.getByRole('spinbutton')).toHaveValue(2);
  await userEvent.click(screen.getByRole('button', { name: '+' }));
  await userEvent.click(screen.getByRole('button', { name: '+' }));
  expect(screen.getByRole('spinbutton')).toHaveValue(3);
  await userEvent.click(screen.getByRole('button', { name: '-' }));
  expect(screen.getByRole('spinbutton')).toHaveValue(2);
  await userEvent.click(screen.getByRole('button', { name: 'Retirer' }));
  expect(screen.getByText('Votre panier est vide')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  await userEvent.click(screen.getByRole('button', { name: 'Vider le panier' }));
  expect(screen.getByText('Votre panier est vide')).toBeInTheDocument();
});
