import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * Shared axios instance: sends the session cookie, and attaches the CSRF token to
 * every state-changing request (fetched from /auth/me if not yet known). A 401
 * clears the token and signals the app that the session expired.
 */
const client = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 10000 });
let csrfToken;
client.interceptors.request.use(async (config) => {
  if (
    !['get', 'head', 'options'].includes(config.method) &&
    !['/auth/login', '/auth/register'].includes(config.url)
  ) {
    if (!csrfToken) {
      const { data } = await client.get('/auth/me');
      csrfToken = data.csrfToken;
    }
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
client.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) csrfToken = response.data.csrfToken;
    if (response.config.url === '/auth/logout') csrfToken = undefined;
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      csrfToken = undefined;
      window.dispatchEvent(new Event('session-expired'));
    }
    return Promise.reject(error);
  },
);
export default client;
