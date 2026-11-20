import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import './Orders.css';

const OrderCard = ({ order, showOtp = false, isCancelled = false, onCancel }) => (
  <div className="order-card">
    <h2>{order.item?.name ?? order.itemName ?? 'Unnamed Item'}</h2>
    <p>Price: {rupees(order.amount)}</p>
    <p>Status: {order.status}</p>
    {order.seller && <p>Seller: {fullName(order.seller)}</p>}
    {showOtp && (
      <p className="otp">
        Delivery OTP: {order.otp || 'Not Available'}
        <br />
        <small>Share this with the seller only when you receive the item.</small>
      </p>
    )}
    {isCancelled && <p>Cancelled by: {order.cancelledBy ? fullName(order.cancelledBy) : 'Unknown'}</p>}

    {order.status === 'pending' && onCancel && (
      <button className="cancel-btn" onClick={() => onCancel(order.transactionId)}>
        Cancel Order
      </button>
    )}
  </div>
);

const TABS = [
  { key: 'pending', label: 'Pending Orders' },
  { key: 'placed', label: 'Orders Placed' },
  { key: 'cancelled', label: 'Cancelled Orders' },
];

const Tabs = ({ activeTab, setActiveTab }) => (
  <div className="tabs">
    {TABS.map((t) => (
      <button
        key={t.key}
        onClick={() => setActiveTab(t.key)}
        className={`tab-button ${activeTab === t.key ? 'active' : ''}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const Orders = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [placed, setPlaced] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [placedRes, cancelledRes] = await Promise.all([
        api.get('/order/placed'),
        api.get('/order/cancelled'),
      ]);
      setPlaced(placedRes.data);
      setCancelled(cancelledRes.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load orders'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancelOrder = async (transactionId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.patch(`/order/${transactionId}/cancel`);
      toast.success('Order cancelled');
      await load();
      setActiveTab('cancelled');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to cancel order'));
    }
  };

  const pending = placed.filter((o) => o.status === 'pending');
  const completed = placed.filter((o) => o.status === 'completed');

  const renderOrders = (orders, options = {}) =>
    orders.length ? (
      orders.map((order) => <OrderCard key={order._id} order={order} {...options} />)
    ) : (
      <p>No orders to display.</p>
    );

  return (
    <div className="page-container">
      <h1 className="section-title">Orders Dashboard</h1>
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="orders-list">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {activeTab === 'pending' && renderOrders(pending, { showOtp: true, onCancel: handleCancelOrder })}
            {activeTab === 'placed' && renderOrders(completed)}
            {activeTab === 'cancelled' && renderOrders(cancelled, { isCancelled: true })}
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
