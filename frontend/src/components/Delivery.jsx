import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import './Delivery.css';

const DeliveryCard = ({ order, onComplete, onCancel }) => {
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleComplete = async () => {
    if (!/^\d{6}$/.test(otpInput.trim())) {
      setError('Enter the 6-digit OTP from the buyer.');
      return;
    }

    setBusy(true);
    try {
      await api.patch(`/order/${order.transactionId}/complete`, { otp: otpInput.trim() });
      setError('');
      toast.success('Delivery completed');
      onComplete(order.transactionId);
    } catch (err) {
      setError(errorMessage(err, 'Failed to verify OTP'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="delivery-card">
      <h2>{order.item?.name ?? order.itemName ?? 'Unnamed Item'}</h2>
      <p>Price: {rupees(order.amount)}</p>
      <p>
        Buyer: {fullName(order.buyer)}
        {order.buyer?.contactNumber ? ` (${order.buyer.contactNumber})` : ''}
      </p>

      <div className="otp-section">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter OTP"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value)}
        />
        <button onClick={handleComplete} disabled={busy}>
          {busy ? 'Verifying...' : 'Complete Delivery'}
        </button>
        <button onClick={() => onCancel(order.transactionId)} disabled={busy}>
          Cancel
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

const DeliveryPage = () => {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/order/sold')
      .then((res) => setDeliveryOrders(res.data))
      .catch((err) => toast.error(errorMessage(err, 'Could not load deliveries')))
      .finally(() => setLoading(false));
  }, []);

  const removeOrder = (transactionId) =>
    setDeliveryOrders((prev) => prev.filter((o) => o.transactionId !== transactionId));

  const handleCancel = async (transactionId) => {
    if (!window.confirm('Cancel this order? The item will go back on sale.')) return;
    try {
      await api.patch(`/order/${transactionId}/cancel`);
      toast.success('Order cancelled');
      removeOrder(transactionId);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to cancel order'));
    }
  };

  return (
    <div className="page-container">
      <h1 className="section-title">Deliver Items</h1>
      {loading ? (
        <p>Loading...</p>
      ) : deliveryOrders.length === 0 ? (
        <p>No pending deliveries.</p>
      ) : (
        deliveryOrders.map((order) => (
          <DeliveryCard key={order._id} order={order} onComplete={removeOrder} onCancel={handleCancel} />
        ))
      )}
    </div>
  );
};

export default DeliveryPage;
