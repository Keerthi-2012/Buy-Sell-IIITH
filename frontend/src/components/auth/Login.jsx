import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { api, errorMessage } from '../../utils/api';
import { setUser } from '../../redux/authslice';
import PasswordInput from '../shared/PasswordInput';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState({
    email: '',
    password: ''
  });
// Where the IIIT CAS server should send the user after signing in.
const CAS_CALLBACK_URL = import.meta.env.VITE_CAS_CALLBACK;

// Hands off to the IIIT CAS login page; we come back to /cas-callback with a ticket.
const handleCasLogin = () => {
  const serviceUrl = encodeURIComponent(CAS_CALLBACK_URL);
  window.location.href = `https://login.iiit.ac.in/cas/login?service=${serviceUrl}`;
};

  // Generic input handler: updates whichever field changed.
  const changeEventHandler = (e) => {
    setInput({
      ...input,
      [e.target.name]: e.target.value
    });
  };

  // Quick client-side checks, then logs in; on success go back to where they came from.
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
    <div className="auth-page">
      <form className="auth-card" onSubmit={submitHandler}>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Log in to buy, sell and track your orders.</p>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@students.iiit.ac.in"
            value={input.email}
            onChange={changeEventHandler}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={input.password}
            onChange={changeEventHandler}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="auth-divider">or</div>

        <button type="button" className="auth-cas" onClick={handleCasLogin} disabled={loading}>
          Login via IIIT CAS
        </button>

        <p className="auth-switch">
          Don't have an account? <RouterLink to="/register">Register</RouterLink>
        </p>
      </form>
    </div>
  );
};

export default Login;
