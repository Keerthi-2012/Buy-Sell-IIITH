import './Navbar.css'
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from '../ui/popover'

import { LogOut, User2 } from 'lucide-react'
import { Link as RouterLink, NavLink, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux';
import { logoutUser } from '@/redux/authActions'
import { goTo } from '@/utils/navigation'

const Navbar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    // "Keerthi Seela" -> "KS" for the avatar circle.
    const getInitials = (firstName, lastName) => {
        if (!firstName && !lastName) return "US";
        const first = firstName?.[0] ?? "";
        const second = lastName?.[0] ?? "";
        return `${first}${second}`.toUpperCase();
    };
    const CLIENT_BASE = import.meta.env.VITE_CLIENT_BASE_URL;
    // Ends our session. Only people who signed in through CAS also sign out of IIIT's single
    // sign-on (an external page); everyone else just goes to the login page.
    const handleLogout = async () => {
        const usedCas = user?.authProvider === 'cas';
        await dispatch(logoutUser());
        if (usedCas && CLIENT_BASE) {
            goTo(`https://login.iiit.ac.in/cas/logout?service=${encodeURIComponent(CLIENT_BASE)}`);
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="navbar-container">
            <div className="logo">
                Buy<span>Sell</span>
            </div>
            <div className="nav-right">
                <ul className="nav-links">
                    <li><NavLink to="/" end>Home</NavLink></li>
                    <li><NavLink to="/BrowseItems">Browse</NavLink></li>
                    <li><NavLink to="/SellItem">Sell</NavLink></li>
                    <li><NavLink to="/cart">Cart</NavLink></li>
                    <li><NavLink to="/Orders">Orders</NavLink></li>
                    <li><NavLink to="/DeliveryPage">Delivery</NavLink></li>
                    <li><NavLink to="/MyListings">My Listings</NavLink></li>
                    {user?.isAdmin && <li><NavLink to="/Admin">Admin</NavLink></li>}
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
