import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errorMessage, rupees } from '../utils/api';
import './CartItem.css';

export const CartItem = ({ item, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!item) {
    return <div className="cart-item">Invalid item</div>;
  }

  const handleBuyNow = async () => {
    setLoading(true);
    try {
      await api.post('/order/checkout', { items: [item._id] });
      toast.success('Order placed! Your delivery OTP is on the Orders page.');
      navigate('/orders');
    } catch (err) {
      toast.error(errorMessage(err, 'Buy Now failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='cart-item'>
      <div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
      </div>
      <div className='text-right'>
        <p className='price'>{rupees(item.price)}</p>
        <button className='buy' onClick={handleBuyNow} disabled={loading}>
          {loading ? 'Processing...' : 'Buy Now'}
        </button>
        <button className='remove' onClick={() => onRemove(item._id)} disabled={loading}>
          Remove
        </button>
      </div>
    </div>
  );
};
