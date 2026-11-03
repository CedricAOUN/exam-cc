// src/App.js
import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Order from './pages/Order';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ShippingPayment from './pages/ShippingPayment';
import RouteError from './components/RouteError';

/**
 * Main layout: Navbar plus the matched child route in an Outlet.
 * @returns {JSX.Element}
 */
const MainLayout = () => (
  <>
    <Navbar />
    <main className="p-4">
      <Outlet />
    </main>
  </>
);

/**
 * Route table. `shipping-payment` and `order` require login, `admin` requires
 * the admin role; `shippig_payment` is a legacy typo redirect.
 * @type {Object[]}
 */
export const appRoutes = [
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <ProductList />,
      },
      { path: 'products', element: <ProductList /> },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'shipping-payment',
        element: (
          <ProtectedRoute>
            <ShippingPayment />
          </ProtectedRoute>
        ),
      },
      { path: 'shippig_payment', element: <Navigate to="/shipping-payment" replace /> },
      {
        path: 'cart',
        element: <Cart />,
      },
      {
        path: 'order',
        element: (
          <ProtectedRoute>
            <Order />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
    ],
  },
];
const router = createBrowserRouter(appRoutes);

/**
 * Application root: mounts the router.
 * @returns {JSX.Element}
 */
const App = () => <RouterProvider router={router} />;

export default App;
