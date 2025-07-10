import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/authslice';
import { USER_API_ENDPOINT } from '../../utils/constant';

const CasCallback = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const ticket = urlParams.get('ticket');

        if (!ticket) {
            toast.error('CAS login failed: No ticket found.');
            return;
        }

        const validateTicket = async () => {
            try {
                // Make sure this line is syntactically valid:
                const res = await axios.get(`${USER_API_ENDPOINT}/cas-login`, {
                    params: { ticket }
                });


                const { token, user, message } = res.data;

                if (!token || !user) {
                    toast.error('CAS login failed: Invalid server response.');
                    return;
                }

                localStorage.setItem('token', token);
                dispatch(setUser(user));

                toast.success(message || 'CAS login successful!');
                navigate('/'); // Redirect to home
            } catch (err) {
                console.error(err);
                toast.error('CAS login failed.');
            }
        };

        validateTicket();
    }, []);

    return <p>Logging in via CAS...</p>;
};

export default CasCallback;