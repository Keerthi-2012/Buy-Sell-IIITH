import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Navbar from './shared/Navbar';
import './Orders.css';

const OrderCard = ({ order, showOtp = false, isCancelled = false, onComplete, onCancel }) => (
  <div className="order-card">
    <h2>{order.item?.name ?? order.itemName ?? 'Unnamed Item'}</h2>
    <p>Status: {order.status}</p>
    {showOtp && <p className="otp">Delivery OTP: {order.otp || 'Not Available'}</p>}
    {isCancelled && (
      <p>
        Cancelled by: {order.cancelledBy?.name ?? order.cancelledBy?.email ?? 'Unknown'}
      </p>
    )}

    {order.status === 'pending' && onCancel && (
      <button className="cancel-btn" onClick={() => onCancel(order.transactionId)}>
        Cancel Order
      </button>
    )}
  </div>
);

const Tabs = ({ activeTab, setActiveTab }) => (
  <div className="tabs">
    <button
      onClick={() => setActiveTab('pending')}
      className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
    >
      Pending Orders
    </button>
    <button
      onClick={() => setActiveTab('placed')}
      className={`tab-button ${activeTab === 'placed' ? 'active' : ''}`}
    >
      Orders Placed
    </button>
    <button
      onClick={() => setActiveTab('cancelled')}
      className={`tab-button ${activeTab === 'cancelled' ? 'active' : ''}`}
    >
      Cancelled Orders
    </button>
  </div>
);

const Orders = () => {
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !user._id) return;

      try {
        setLoading(true);

        const [pendingRes, placedRes, cancelledRes] = await Promise.all([
          fetch(`http://localhost:8000/api/v1/order/`, {
            credentials: 'include',
          }),
          fetch(`http://localhost:8000/api/v1/order/placed/${user._id}`, {
            credentials: 'include',
          }),
          fetch(`http://localhost:8000/api/v1/order/cancelled/${user._id}`, {
            credentials: 'include',
          }),
        ]);

        const [pendingData, placedData, cancelledData] = await Promise.all([
          pendingRes.json(),
          placedRes.json(),
          cancelledRes.json(),
        ]);

        const filteredPending = Array.isArray(placedData)
          ? placedData.filter((order) => order.status === 'pending')
          : [];

        const filteredPlaced = Array.isArray(placedData)
          ? placedData.filter((order) => order.status === 'completed')
          : [];

        setPendingOrders(filteredPending);
        setPlacedOrders(filteredPlaced);
        setCancelledOrders(Array.isArray(cancelledData) ? cancelledData : []);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleCompleteOrder = async (transactionId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/order/complete/${transactionId}`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to complete order: ${err.message}`);
        return;
      }

      const updatedOrder = await res.json();

      setPendingOrders((prev) => prev.filter((o) => o.transactionId !== transactionId));
      setPlacedOrders((prev) => [updatedOrder, ...prev]);
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Something went wrong!');
    }
  };

  const handleCancelOrder = async (transactionId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/order/cancel/${transactionId}`, {
        method: 'PATCH',
          headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ Send token for backend to authenticate
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to cancel order: ${err.message}`);
        return;
      }

      const cancelledOrder = await res.json();

      setPendingOrders((prev) => prev.filter((o) => o.transactionId !== transactionId));
      setCancelledOrders((prev) => [cancelledOrder, ...prev]);
      setActiveTab('cancelled');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Something went wrong!');
    }
  };

  const renderOrders = (orders, options = {}) =>
    orders.length ? (
      orders.map((order) => (
        <OrderCard
          key={order._id || order.id}
          order={order}
          onComplete={handleCompleteOrder}
          onCancel={handleCancelOrder}
          {...options}
        />
      ))
    ) : (
      <p>No orders to display.</p>
    );

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1 className="section-title">Orders Dashboard</h1>
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="orders-list">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              {activeTab === 'pending' && renderOrders(pendingOrders, { showOtp: true })}
              {activeTab === 'placed' && renderOrders(placedOrders)}
              {activeTab === 'cancelled' && renderOrders(cancelledOrders, { isCancelled: true })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
