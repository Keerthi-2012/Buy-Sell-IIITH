import { Link } from 'react-router-dom';
import './Main.css';

// Hero banner with the tagline on the landing page.
const Main = () => {
    return (
        <div className='main-container'>
            <div className='main-content'>
                <span className='main-tagline'>
                    IIIT's Exclusive Buy & Sell Platform
                </span>
                <h1 className='main-heading'>
                    Buy or Sell <br />
                    <span className='main-highlight'>Anything, Anytime</span>
                </h1>
                <p className='main-description'>
                    Buy and sell books, electronics, hostel essentials, and more — right on campus.
                </p>
                <div className='main-actions'>
                    <Link to='/browseitems' className='main-cta'>Browse items</Link>
                    <Link to='/sellitem' className='main-cta main-cta-secondary'>Sell an item</Link>
                </div>
            </div>
        </div>
    );
};

export default Main;
