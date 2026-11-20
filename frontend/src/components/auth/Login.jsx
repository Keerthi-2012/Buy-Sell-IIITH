import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { api, errorMessage } from '../../utils/api';
import { setUser } from '../../redux/authslice';
import './Login.css'; // Make sure path matches your project structure

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    email: '',
    password: ''
  });
const CAS_CALLBACK_URL = import.meta.env.VITE_CAS_CALLBACK;

const handleCasLogin = () => {
  const serviceUrl = encodeURIComponent(CAS_CALLBACK_URL);
  window.location.href = `https://login.iiit.ac.in/cas/login?service=${serviceUrl}`;
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
      const { data } = await api.post('/user/login', {
        email: input.email.trim(),
        password: input.password,
      });

      dispatch(setUser(data.user)); // the session itself is the httpOnly cookie
      toast.success(data.message || 'Login successful!');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'Login failed'));
      setInput((prev) => ({ ...prev, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
