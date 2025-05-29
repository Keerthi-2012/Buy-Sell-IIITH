import React, { useState } from 'react'
import Navbar from '../shared/Navbar'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { toast, Toaster } from 'sonner'
import axios from 'axios'
import './Register.css'
import { USER_API_ENDPOINT } from '../../utils/constant'

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

    const changeEventHandler = (e) => {
        setInput({
            ...input,
            [e.target.name]: e.target.value
        });
    };

    // Enhanced client-side validation
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
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
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

        // Enhanced email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Please enter a valid email address');
            return false;
        }

        // Contact number validation (basic)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(contactNumber.replace(/[\s\-\(\)]/g, ''))) {
            toast.error('Please enter a valid contact number');
            return false;
        }

        return true;
    };

    const submitHandler = async (e) => {
        e.preventDefault();

        // Validate form before submission
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Convert age to number and ensure all fields are properly formatted
            const formData = {
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                email: input.email.trim().toLowerCase(),
                password: input.password,
                age: parseInt(input.age),
                contactNumber: input.contactNumber.trim()
            };

            console.log('API Endpoint:', USER_API_ENDPOINT);
            console.log('Sending registration data:', {
                ...formData,
                password: '[HIDDEN]' // Don't log password
            });

            const res = await axios.post(`${USER_API_ENDPOINT}/register`, formData, {
                headers: {
                    "Content-Type": "application/json"
                },
                withCredentials: true,
                timeout: 10000 // 10 second timeout
            });

            console.log('Registration response:', res.data);

            if (res.data.success) {
                toast.success(res.data.message || 'Registration successful!');
                // Clear form on success
                setInput({
                    firstName: '',
                    lastName: '',
                    contactNumber: '',
                    age: '',
                    email: '',
                    password: ''
                });
                navigate('/login');
            } else {
                Toaster.error(res.data.message || 'Registration failed');
            }

        } catch (error) {
            console.error('Error during registration:', error);

            if (error.response) {
                // Server responded with error status
                const statusCode = error.response.status;
                const errorData = error.response.data;
                const errorMessage = errorData?.message || errorData?.msg || errorData?.error || 'An unknown error occurred';


                console.log('Error response status:', statusCode);
                console.log('Error response data:', errorData);

                switch (statusCode) {
                    case 400:
                        toast.error(errorMessage || 'Invalid input data. Please check all fields.');
                        break;
                    case 409:
                        toast.error('User with this email already exists');
                        break;
                    case 422:
                        toast.error('Validation error. Please check your input.');
                        break;
                    case 500:
                        toast.error('Server error. Please try again later.');
                        console.error('Server Error Details:', errorData);
                        break;
                    default:
                        toast.error(errorMessage || `Registration failed (Error ${statusCode})`);
                }
            } else if (error.request) {
                // Network error
                console.error('Network error:', error.request);
                toast.error('Network error. Please check your connection and try again.');
            } else if (error.code === 'ECONNABORTED') {
                // Timeout error
                toast.error('Request timeout. Please try again.');
            } else {
                // Something else happened
                console.error('Unexpected error:', error.message);
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Navbar />

            <Toaster richColors position="top-center" />
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

export default Register;