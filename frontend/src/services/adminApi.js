import client from './client';
/** @returns {Promise<import('axios').AxiosResponse>} All orders (admin). */
export const getOrders = () => client.get('/orders');
/** @returns {Promise<import('axios').AxiosResponse>} All products. */
export const getProducts = () => client.get('/products');
/**
 * @param {string} orderId
 * @param {string} status New order status.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateOrderStatus = (orderId, status) =>
  client.put(`/orders/${orderId}/status`, { status });
/**
 * @param {string} orderId
 * @returns {Promise<import('axios').AxiosResponse>} Validates the order (admin).
 */
export const validateOrder = (orderId) => client.put(`/orders/${orderId}/validate`);
/**
 * @param {string} productId
 * @param {number} stock New absolute stock level.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const updateProductStock = (productId, stock) =>
  client.put(`/products/${productId}/stock`, { stock });
