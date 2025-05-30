import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Navbar from './shared/Navbar';
import './Delivery.css';

const DeliveryCard = ({ order, onComplete }) => {
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token'); // or get it from Redux

  const handleComplete = async () => {
    if (!otpInput) {
      setError('OTP is required.');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/order/verify-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: order.transactionId,
          otp: otpInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to verify OTP');
      } else {
        setError('');
        onComplete(order.transactionId); // You may also refresh or refetch orders here
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="delivery-card">
      <h2>{order.item?.name || 'Unnamed Item'}</h2>
      <p>Price: ₹{order.item?.price}</p>
      <p>Buyer: {order.buyer?.name || order.buyerName || 'Unknown'}</p>

      <div className="otp-section">
        <input
          type="text"
          placeholder="Enter OTP"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value)}
        />
        <button onClick={handleComplete}>Complete Delivery</button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

const DeliveryPage = () => {
  const user = useSelector((state) => state.auth.user);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingDeliveries = async () => {
      if (!user || !user._id) return;

      try {
        setLoading(true);
        const soldRes = await fetch(`http://localhost:8000/api/v1/order/sold/${user._id}`, {
          credentials: 'include',
        });
        const soldData = await soldRes.json();
        setDeliveryOrders(Array.isArray(soldData) ? soldData : []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDeliveries();
  }, [user]);

  const handleDeliveryComplete = (transactionId) => {
    setDeliveryOrders((prev) => prev.filter((order) => order.transactionId !== transactionId));
  };

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1 className="section-title">Deliver Items</h1>
        {loading ? (
          <p>Loading...</p>
        ) : deliveryOrders.length === 0 ? (
          <p>No pending deliveries.</p>
        ) : (
          deliveryOrders.map((order) => (
            <DeliveryCard
              key={order._id}
              order={order}
              onComplete={handleDeliveryComplete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryPage;
