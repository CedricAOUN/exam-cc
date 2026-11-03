import axios from 'axios';
import { API_BASE_URL } from './config';

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
