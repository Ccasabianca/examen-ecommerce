// src/services/adminApi.js
// fix : instance api commune (cookie de session), plus de jeton lu dans localstorage ni de try/catch inutiles
import api from "./api";

export const getOrders = () => api.get("/orders");

export const getProducts = () => api.get("/products");

export const updateOrderStatus = (orderId, status) =>
  api.put(`/orders/${orderId}/status`, { status });

export const validateOrder = (orderId) => api.put(`/orders/${orderId}/validate`);

export const deleteOrder = (orderId) => api.delete(`/orders/${orderId}`);

export const updateProductStock = (productId, stock) =>
  api.put(`/products/${productId}/stock`, { stock });
