import client from './client';
/** @returns {Promise<AxiosResponse>} Public product catalogue. */
export const fetchProducts = () => client.get('/products');
/**
 * Create an order; the idempotency header makes retries safe.
 * @param {Object} orderData Items, shipping address and methods.
 * @param {string} checkoutKey Sent as the `Idempotency-Key` header.
 * @returns {Promise<AxiosResponse>}
 */
export const createOrder = (orderData, checkoutKey) =>
  client.post('/orders', orderData, { headers: { 'Idempotency-Key': checkoutKey } });
