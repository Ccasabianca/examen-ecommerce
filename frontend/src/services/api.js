// src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from './config';

// fix : une seule instance axios, le cookie de session httponly part avec chaque requête
// délai long : une commande traverse le gateway et le stock, des services render gratuits qui
// mettent jusqu'à une minute à se réveiller
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 120000,
});

// sur un 401 hors /auth/, AuthProvider ferme la session côté client
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** message lisible à partir d'une erreur axios (message du serveur, détail de validation ou réseau) */
export const getErrorMessage = (error, fallback = 'Une erreur est survenue. Veuillez réessayer.') => {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.message).join('\n');
  }
  if (data?.message) return data.message;
  if (error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  }
  return fallback;
};

export const fetchProducts = () => api.get('/products');

// fix : seuls le produit et la quantité partent, le serveur calcule les prix et le total
// fix : le jeton et la commande ne sont plus écrits dans la console du navigateur
export const createOrder = ({ items, shippingAddress, paymentMethod, shippingMethod }) =>
  api.post('/orders', {
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    shippingAddress,
    paymentMethod,
    shippingMethod,
  });

export const getMyOrders = () => api.get('/orders/mine');

export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (formData) => api.post('/auth/register', formData);
export const logout = () => api.post('/auth/logout');
export const getSession = () => api.get('/auth/me');

export default api;
