import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CartItem.css';

export const CartItem = ({ item, quantity, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!item) {
    return <div className="cart-item">Invalid item</div>;
  }

  const handleBuyNow = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:8000/api/v1/order/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [item._id],
          otp: "000000", // Hardcoded OTP for testing
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Checkout failed");
      }

      alert("Order placed successfully!");
      navigate("/orders");
    } catch (err) {
      alert(`Buy Now failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = () => {
    onRemove(item._id);
  };

  return (
    <div className='cart-item'>
      <div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <p>Quantity: {quantity}</p>
      </div>
      <div className='text-right'>
        <p className='price'>₹{item.price}</p>
        <button className='buy' onClick={handleBuyNow} disabled={loading}>
          {loading ? "Processing..." : "Buy Now"}
        </button>
        <button className='remove' onClick={handleRemoveClick} disabled={loading}>
          Remove
        </button>
      </div>
    </div>
  );
};
