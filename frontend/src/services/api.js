import client from './client';
export const fetchProducts = () => client.get('/products');
export const createOrder = (orderData, checkoutKey) =>
  client.post('/orders', orderData, { headers: { 'Idempotency-Key': checkoutKey } });
