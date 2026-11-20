import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

import store from './redux/store';
import { setUser, logout, sessionChecked } from './redux/authslice';
import { api } from './utils/api';

import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import Home from './components/Home';
import Login from './components/auth/Login';
import { Register } from './components/auth/Register';
import CasCallback from './components/auth/CasCallback';
import BrowseItems from './components/BrowseItems';
import ItemDetails from './components/ItemDetails';
import CartPage from './components/CartPage';
import Orders from './components/Orders';
import Profile from './components/Profile';
import SellItem from './components/SellItem';
import ItemUpdate from './components/ItemUpdate';
import DeliveryPage from './components/Delivery';

// Shared shell: navbar + toast host for every page.
const Layout = () => (
  <>
    <Navbar />
    <Toaster position="top-center" />
    <Outlet />
  </>
);

const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'cas-callback', element: <CasCallback /> },
      { path: 'browseitems', element: <BrowseItems /> },
      { path: 'item/:id', element: <ItemDetails /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'sellitem', element: <SellItem /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'orders', element: <Orders /> },
          { path: 'profile', element: <Profile /> },
          { path: 'update-item/:id', element: <ItemUpdate /> },
          { path: 'deliverypage', element: <DeliveryPage /> },
        ],
      },
    ],
  },
]);

// Confirms the cookie session with the server once on load.
const AppWrapper = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    api
      .get('/user/profile')
      .then((res) => dispatch(setUser(res.data.user)))
      .catch((err) => {
        // Only a 401 means "not logged in"; a network blip shouldn't log anyone out.
        if (err.response?.status === 401) dispatch(logout());
      })
      .finally(() => dispatch(sessionChecked()));
  }, [dispatch]);

  return <RouterProvider router={appRouter} />;
};

function App() {
  return (
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  );
}

export default App;
