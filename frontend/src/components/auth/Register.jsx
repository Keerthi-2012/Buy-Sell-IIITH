import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import './Register.css'
import { api, errorMessage } from '../../utils/api'
import { setUser } from '../../redux/authslice'

export const Register = () => {
    const [input, setInput] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        age: '',
        email: '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({
            ...input,
            [e.target.name]: e.target.value
        });
    };

    // Quick checks so obvious mistakes never reach the server (it re-checks everything).
    const validateForm = () => {
        const { firstName, lastName, email, password, age, contactNumber } = input;

        if (!firstName.trim()) {
            toast.error('First name is required');
            return false;
        }
        if (!lastName.trim()) {
            toast.error('Last name is required');
            return false;
        }
        if (!email.trim()) {
            toast.error('Email is required');
            return false;
        }
        if (!password.trim()) {
            toast.error('Password is required');
            return false;
        }
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return false;
        }
        if (!age || age < 1 || age > 120) {
            toast.error('Please enter a valid age');
            return false;
        }
        if (!contactNumber.trim()) {
            toast.error('Contact number is required');
            return false;
        }

        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return false;
        }

        // Same rule as the server (validators/schemas.js)
        if (!/^\+?[0-9\s\-()]{7,16}$/.test(contactNumber.trim())) {
            toast.error('Please enter a valid contact number');
            return false;
        }

        return true;
    };

    // Validates, registers, and logs the new user in.
    const submitHandler = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Tidy the values the way the server expects them
            const formData = {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                email: input.email.trim().toLowerCase(),
                password: input.password,
                age: parseInt(input.age),
                contactNumber: input.contactNumber.trim()
            };

            const { data } = await api.post('/user/register', formData)

            // The server logs the new user in (cookie), so go straight into the app.
            dispatch(setUser(data.user))
            toast.success(data.message || 'Registration successful!')
            navigate('/')
        } catch (error) {
            toast.error(errorMessage(error, 'Registration failed. Please try again.'))
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>

            <div className="register-container">
                <form onSubmit={submitHandler}>
                    <h1 className="register-title">Register</h1>

                    <div className="form-group">
                        <label>First Name</label>
                        <input name="firstName" type="text" value={input.firstName} onChange={changeEventHandler} required />
                    </div>

                    <div className="form-group">
                        <label>Last Name</label>
                        <input name="lastName" type="text" value={input.lastName} onChange={changeEventHandler} required />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" value={input.email} onChange={changeEventHandler} required />
                    </div>

                    <div className="form-group">
                        <label>Age</label>
                        <input name="age" type="number" value={input.age} onChange={changeEventHandler} required />
                    </div>

                    <div className="form-group">
                        <label>Contact Number</label>
                        <input name="contactNumber" type="tel" value={input.contactNumber} onChange={changeEventHandler} required />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" value={input.password} onChange={changeEventHandler} required />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>

                    <div className="text-center text-sm mt-6">
                        Already have an account? <RouterLink to="/login" className="text-blue-600 ml-1">Login</RouterLink>
                    </div>
                </form>
            </div>

        </div>
    );
};
