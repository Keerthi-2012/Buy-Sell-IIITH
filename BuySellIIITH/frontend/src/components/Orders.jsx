import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Navbar from './shared/Navbar';
import './Orders.css';

const OrderCard = ({ order, showOtp = false, isSold = false, onComplete }) => (
  <div className="order-card">
    <h2>{order.item?.name || order.itemName || 'Unnamed Item'}</h2>   
    <p>Status: {order.status}</p>
    {showOtp && order.otp && <p className="otp">Delivery OTP: {order.otp}</p>}
    {isSold && <p>Buyer: {order.buyer?.name || order.buyerName}</p>}
    {order.status !== 'completed' && (
      <button className="complete-btn" onClick={() => onComplete(order.transactionId)}>
        Mark as Completed
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
      onClick={() => setActiveTab('sold')}
      className={`tab-button ${activeTab === 'sold' ? 'active' : ''}`}
    >
      Items Sold
    </button>
  </div>
);

const Orders = () => {
  const user = useSelector((state) => state.auth.user);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [soldOrders, setSoldOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchOrders = async () => {
    if (!user || !user._id) return;

    try {
      setLoading(true);

      const [pendingRes, placedRes, soldRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/order/`, {
          credentials: 'include',
        }),
        fetch(`http://localhost:8000/api/v1/order/placed/${user._id}`, {
          credentials: 'include',
        }),
        fetch(`http://localhost:8000/api/v1/order/sold/${user._id}`, {
          credentials: 'include',
        }),
      ]);

      const [pendingData, placedData, soldData] = await Promise.all([
        pendingRes.json(),
        placedRes.json(),
        soldRes.json(),
      ]);

      // ✅ Filter based on status
      const filteredPending = Array.isArray(placedData)
        ? placedData.filter((order) => order.status === 'pending')
        : [];

      const filteredPlaced = Array.isArray(placedData)
        ? placedData.filter((order) => order.status === 'completed')
        : [];

      setPendingOrders(filteredPending);
      setPlacedOrders(filteredPlaced);
      setSoldOrders(Array.isArray(soldData) ? soldData : []);
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

      // Update pendingOrders safely
      setPendingOrders((prev) =>
        Array.isArray(prev) ? prev.filter((o) => o.transactionId !== transactionId) : []
      );

      // Add to placedOrders safely
      setPlacedOrders((prev) =>
        Array.isArray(prev) ? [updatedOrder, ...prev] : [updatedOrder]
      );
    } catch (error) {
      console.error('Error completing order:', error);
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
              {activeTab === 'sold' && renderOrders(soldOrders, { isSold: true })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
