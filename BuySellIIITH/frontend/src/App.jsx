import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import store from './redux/store';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from 'react-router-dom';

import Navbar from './components/shared/Navbar';
import Home from './components/Home';
import Login from './components/auth/Login';
import { Register } from './components/auth/Register';
import BrowseItems from './components/BrowseItems';
import CartPage from './components/CartPage';
import Orders from './components/Orders';
import Profile from './components/Profile';
import SellItem from './components/SellItem';
import ItemDetails from './components/ItemDetails';
import { setUser } from './redux/authslice';
import ItemUpdate from './components/ItemUpdate';
import DeliveryPage from './components/Delivery';

// Wrapper to allow useDispatch in the outermost App
const AppWrapper = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      dispatch(setUser(JSON.parse(user)));
    }
  }, [dispatch]);

  return <RouterProvider router={appRouter} />;
};

// Router definition
const appRouter = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        {/* <Navbar /> */}
        <Outlet />
      </>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'Login', element: <Login /> },
      { path: 'Register', element: <Register /> },
      { path: 'BrowseItems', element: <BrowseItems /> },
      { path: 'SellItem', element: <SellItem /> },
      { path: 'Cart', element: <CartPage /> },
      { path: 'Orders', element: <Orders /> },
      { path: 'Profile', element: <Profile /> },
      { path: 'item/:id', element: <ItemDetails /> },
      { path: "/update-item/:id", element:<ItemUpdate/>},
      { path: "/DeliveryPage" , element: <DeliveryPage/>}
    ],
  },
]);

// Main App component
function App() {
  return (
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  );
}

export default App;
