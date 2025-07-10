import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useDispatch } from 'react-redux';

import Navbar from '../shared/Navbar';
import { USER_API_ENDPOINT } from '../../utils/constant';
import { setUser } from '../../redux/authslice';
import './Login.css'; // Make sure path matches your project structure

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    email: '',
    password: ''
  });

const handleCasLogin = () => {
  const serviceUrl = encodeURIComponent('http://localhost:5174/cas-callback');
window.location.href = `https://login.iiit.ac.in/cas/login?service=${encodeURIComponent('http://localhost:5174/cas-callback')}`;


};

  const changeEventHandler = (e) => {
    setInput({
      ...input,
      [e.target.name]: e.target.value
    });
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!input.email || !input.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!input.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${USER_API_ENDPOINT}/login`, {
        email: input.email,
        password: input.password
      });

      const data = response.data;

      if (response.status === 200 || data.success) {
        const normalizedUser = { ...data.user, _id: data.user._id || data.user.id };

        const token = data.token;
        if (!token) {
          toast.error("Login failed: No token received");
          return;
        }
        console.log("Logged in:", normalizedUser);

        localStorage.removeItem('token');                  // Clear old token
        localStorage.setItem('token', data.token);         // Store new token
        console.log("Stored token:", localStorage.getItem('token'));

        dispatch(setUser(normalizedUser));                 // ✅ Redux AFTER token is saved

        toast.success(data.message || 'Login successful!');
        navigate('/');                                     // ✅ Finally navigate
      }

    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.message || 'Login failed');
        setInput(prev => ({ ...prev, password: '' }));
      } else if (error.request) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('An unexpected error occurred.');
      }
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <Toaster position="top-center" reverseOrder={false} />
      <div className="container">
        <form className="login-form" onSubmit={submitHandler}>
          <h1>Login</h1>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={input.email}
              // placeholder="your-email@iiit.ac.in"
              onChange={changeEventHandler}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={input.password}
              // placeholder="Enter your password"
              onChange={changeEventHandler}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-center text-sm text-gray-600 my-2">or</div>

          <button
            type="button"
            className="variant-outline"
            onClick={handleCasLogin}
            disabled={loading}
          >
            Login via IIIT CAS
          </button>

          <div className="text-center text-sm mt-6">
            Don't have an account?
            <RouterLink to="/register" className="text-blue-600 ml-1">
              Register
            </RouterLink>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
