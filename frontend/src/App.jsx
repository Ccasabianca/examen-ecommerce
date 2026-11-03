// src/App.jsx
import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Order from './pages/Order';
import MyOrders from './pages/MyOrders';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ShippingPayment from './pages/ShippingPayment';

// Layout principal avec Navbar et Outlet
const MainLayout = () => (
  <>
    <Navbar />
    <main className="p-4">
      <Outlet />
    </main>
  </>
);

// Définition des routes avec le MainLayout
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <ProductList />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        // fix : chemin corrigé, avant "shippig_payment"
        path: 'shipping_payment',
        element: <ShippingPayment />,
      },
      {
        path: 'cart',
        element: <Cart />,
      },
      {
        path: 'order',
        element: <ProtectedRoute><Order /></ProtectedRoute>,
      },
      {
        // fix : suivi des commandes côté client, la page n'existait pas
        path: 'mes-commandes',
        element: <ProtectedRoute><MyOrders /></ProtectedRoute>,
      },
      {
        path: 'admin',
        element: <AdminRoute><Admin /></AdminRoute>,
      },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
