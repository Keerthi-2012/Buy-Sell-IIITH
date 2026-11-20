import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/authslice';
import { api, errorMessage } from '../../utils/api';

const CasCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // CAS tickets are single-use and StrictMode runs effects twice in dev.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const ticket = new URLSearchParams(window.location.search).get('ticket');
    const service = import.meta.env.VITE_CAS_CALLBACK;

    if (!ticket) {
      toast.error('CAS login failed: No ticket found.');
      navigate('/login', { replace: true });
      return;
    }

    // The server checks the ticket with CAS and sets our login cookie.
    api
      .get('/user/cas-login', { params: { ticket, service } })
      .then(({ data }) => {
        dispatch(setUser(data.user));
        toast.success(data.message || 'CAS login successful!');
        navigate('/', { replace: true });
      })
      .catch((err) => {
        toast.error(errorMessage(err, 'CAS login failed.'));
        navigate('/login', { replace: true });
      });
  }, [dispatch, navigate]);

  return <p style={{ padding: '2rem' }}>Logging in via CAS...</p>;
};

export default CasCallback;
