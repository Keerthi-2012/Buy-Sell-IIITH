import React from 'react';
import './CartItem.css';

export const CartItem = ({ item, quantity }) => {
  return (
    <div className='cart-item'>
      <div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <p>Quantity: {quantity}</p>
      </div>
      <div className='text-right'>
        <p className='price'>₹{item.price}</p>
        <button className='buy'>Buy Now</button>
        <button className='remove'>Remove</button>
      </div>
    </div>
  );
};
