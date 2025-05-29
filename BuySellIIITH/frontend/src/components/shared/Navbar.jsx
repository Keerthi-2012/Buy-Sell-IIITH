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

    const getInitials = (name) => {
        if (!name) return "US";
        const [first, last] = name.split(" ");
        return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };
    const { user } = useSelector((state) => state.auth);
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
                                    <div className="avatar-trigger">
                                        <div className="avatar-fallback">
                                            {getInitials(user.name)}
                                        </div>
                                    </div>

                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="popover-content">
                                <div>
                                    <div className="popover-header">
                                        <div className="avatar-trigger">
                                        <div className="avatar-fallback">
                                            {getInitials(user.name)}
                                        </div>
                                    </div>
                                        <div>
                                            <h4 className="user-name">{user.name}</h4>
                                        </div>
                                    </div>
                                    <div className="popover-actions">
                                        <div className="action-item">
                                            <User2 />
                                            <RouterLink to="/Profile">View Profile</RouterLink>
                                        </div>
                                        <div className="action-item">
                                            <LogOut />
                                            <Button variant="link" onClick={handleLogout}>Logout</Button>

                                        </div>
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
