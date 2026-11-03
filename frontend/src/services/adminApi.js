import client from './client';
export const getOrders = () => client.get('/orders');
export const getProducts = () => client.get('/products');
export const updateOrderStatus = (orderId, status) =>
  client.put(`/orders/${orderId}/status`, { status });
export const validateOrder = (orderId) => client.put(`/orders/${orderId}/validate`);
export const updateProductStock = (productId, stock) =>
  client.put(`/products/${productId}/stock`, { stock });
