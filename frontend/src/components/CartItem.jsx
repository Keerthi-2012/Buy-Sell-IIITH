import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, rupees } from '../utils/api';
import { reportError } from '../utils/reportError';
import './CartItem.css';

// Small square +/- buttons; inline so the cart's full-width button styles don't stretch them.
const stepButton = (disabled) => ({
  width: '2rem',
  height: '2rem',
  padding: 0,
  margin: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

// One cart row: quantity +/- buttons, the line total, and buy/remove actions.
export const CartItem = ({ item, quantity, onQuantityChange, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!item) {
    return <div className="cart-item">Invalid item</div>;
  }

  // Buys just this row at its current quantity, without checking out the rest of the cart.
  const handleBuyNow = async () => {
    setLoading(true);
    try {
      await api.post('/order/checkout', { items: [item._id] });
      toast.success('Order placed! Your delivery OTP is on the Orders page.');
      navigate('/orders');
    } catch (err) {
      reportError(err, navigate, 'Buy Now failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='cart-item'>
      <div>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          Quantity:
          <button
            style={stepButton(loading || quantity <= 1)}
            onClick={() => onQuantityChange(item._id, quantity - 1)}
            disabled={loading || quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            style={stepButton(loading || quantity >= item.quantity)}
            onClick={() => onQuantityChange(item._id, quantity + 1)}
            disabled={loading || quantity >= item.quantity}
            aria-label="Increase quantity"
          >
            +
          </button>
          {item.quantity < 5 && <small>({item.quantity} in stock)</small>}
        </p>
      </div>
      <div className='text-right'>
        <p className='price'>{rupees(item.price * quantity)}</p>
        {quantity > 1 && <small>{rupees(item.price)} each</small>}
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
