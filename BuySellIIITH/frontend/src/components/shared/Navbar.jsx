import React from 'react'
import './Navbar.css'
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '../ui/popover'

import { Button } from '../ui/button'
import { Avatar, AvatarImage } from '../ui/avatar'
import { Link, LogOut, User2 } from 'lucide-react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux';
import { logoutUser } from '@/redux/authActions'

const Navbar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const getInitials = (firstName, lastName) => {
        if (!firstName && !lastName) return "US";
        const first = firstName?.[0] ?? "";
        const second = lastName?.[0] ?? "";
        return `${first}${second}`.toUpperCase();
    };

    const handleLogout = async () => {
        dispatch(logoutUser());
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="navbar-container">
            <div className="logo">
                Buy<span>Sell</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <ul className="nav-links">
                    <li><RouterLink to="/">Home</RouterLink></li>
                    <li><RouterLink to="/BrowseItems">Browse</RouterLink></li>
                    <li><RouterLink to="/SellItem">Sell</RouterLink></li>
                    <li><RouterLink to="/cart">Cart</RouterLink></li>
                    <li><RouterLink to="/Orders">Orders</RouterLink></li>
                    <li><RouterLink to="/DeliveryPage">Delivery</RouterLink></li>
                </ul>
                {
                    !user ? (
                        <div className="auth-buttons">
                            <RouterLink to="/login">
                                <button className="login-btn">Login</button>
                            </RouterLink>
                            <RouterLink to="/register">
                                <button className="register-btn">Register</button>
                            </RouterLink>
                        </div>
                    ) : (
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="avatar-trigger">
                                    <div className="avatar-fallback">
                                        {getInitials(user.firstName, user.lastName)}
                                    </div>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="popover-content">
                                <div>
                                    <div className="popover-header">
                                        <div className="avatar-fallback">
                                            {getInitials(user.firstName, user.lastName)}
                                        </div>
                                        <div>
                                            <h4 className="user-name">{user.firstName} {user.lastName}</h4>
                                        </div>
                                    </div>
                                    <div className="popover-actions">
                                        <RouterLink to="/Profile" className="action-item">
                                            <User2 size={16} />
                                            View Profile
                                        </RouterLink>
                                        <button className="logout-btn" onClick={handleLogout}>
                                            <LogOut size={16} />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </PopoverContent>

                        </Popover>
                    )
                }
            </div>
        </div>
    )
}

export default Navbar
