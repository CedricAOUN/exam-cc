import { cartReducer } from './CartContext';
test('adding an existing product preserves the previous state and respects stock', () => {
  const product = Object.freeze({ id: 'p1', quantity: 1, stock: 2 });
  const state = { cart: Object.freeze([product]) };
  const next = cartReducer(state, { type: 'ADD_TO_CART', payload: { id: 'p1' } });
  expect(product.quantity).toBe(1);
  expect(next.cart[0].quantity).toBe(2);
  expect(cartReducer(next, { type: 'ADD_TO_CART', payload: { id: 'p1' } }).cart[0].quantity).toBe(
    2,
  );
});
test('out-of-stock products cannot be added', () => {
  const state = { cart: [] };
  expect(cartReducer(state, { type: 'ADD_TO_CART', payload: { id: 'p1', stock: 0 } })).toBe(state);
});
