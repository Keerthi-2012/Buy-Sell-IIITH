import React from 'react';
import './CartSummary.css';

export const CartSummary = () => {
    return (
        <div className='cart-summary'>
            <h2>Order Summary</h2>
            <div className='row'>
                <span>Subtotal</span>
                <span>$XXX.XX</span>
            </div>
            <div className='row'>
                <span>Shipping</span>
                <span>$X.XX</span>
            </div>
            <hr />
            <div className='row bold-row'>
                <span>Total</span>
                <span>$XXX.XX</span>
            </div>
            <button>Proceed to Checkout</button>
        </div>
    );
};
