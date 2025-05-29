import React from 'react';
import './Main.css';

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
            </div>
        </div>
    );
};

export default Main;
