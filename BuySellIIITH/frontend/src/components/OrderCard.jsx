// OrderCard.jsx
import React from 'react';
import './OrderCard.css';

export const OrderCard = ({ order, showOtp = false, isSold = false }) => {
  return (
    <div className="order-card">
      <h2 className="order-title">{order.item}</h2>
      <p className="order-status">Status: {order.status}</p>
      {showOtp && <p className="order-otp">Delivery OTP: {order.otp}</p>}
      {isSold && <p>Buyer: {order.buyer}</p>}
    </div>
  );
};
