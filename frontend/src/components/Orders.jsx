import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ReviewForm from './ReviewForm';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import './Orders.css';

// Explains why a cancelled order was cancelled.
const cancelNote = (order) => {
  if (order.cancelReason === 'expired') return 'Expired: not completed in time';
  if (order.cancelReason === 'removed') return 'Listing was removed by an admin';
  return `Cancelled by: ${order.cancelledBy ? fullName(order.cancelledBy) : 'Unknown'}`;
};

// One order in the list; the OTP, review form and cancel button show only where the tab asks.
const OrderCard = ({ order, showOtp = false, isCancelled = false, canReview = false, onCancel, onReviewed }) => (
  <div className="order-card">
    <h2>{order.item?.name ?? order.itemName ?? 'Unnamed Item'}</h2>
    <p>
      Price: {rupees(order.amount)}
      {order.quantity > 1 && ` (${order.quantity} × ${rupees(order.amount / order.quantity)})`}
    </p>
    <p>Status: {order.status}</p>
    {order.seller && <p>Seller: {fullName(order.seller)}</p>}
    {showOtp && (
      <p className="otp">
        Delivery OTP: {order.otp || 'Not Available'}
        <br />
        <small>Share this with the seller only when you receive the item.</small>
      </p>
    )}
    {order.status === 'pending' && order.expiresAt && (
      <p>
        <small>Released automatically on {new Date(order.expiresAt).toLocaleDateString()} if not completed.</small>
      </p>
    )}
    {isCancelled && <p>{cancelNote(order)}</p>}

    {canReview &&
      (order.reviewed ? (
        <p>You've rated this seller. Thanks!</p>
      ) : (
        <ReviewForm transactionId={order.transactionId} onDone={onReviewed} />
      ))}

    {order.status === 'pending' && onCancel && (
      <button className="cancel-btn" onClick={() => onCancel(order.transactionId)}>
        Cancel Order
      </button>
    )}
  </div>
);

// Tab definitions, so the buttons and the content stay in sync.
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

  // Fetches the user's purchases and cancelled orders together.
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

  // Asks first, cancels on the server, then reloads so statuses are fresh.
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

  // One list from the server, split into the two tabs that use it.
  const pending = placed.filter((o) => o.status === 'pending');
  const completed = placed.filter((o) => o.status === 'completed');

  // Renders a list of orders, or a friendly empty message.
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
            {activeTab === 'placed' && renderOrders(completed, { canReview: true, onReviewed: load })}
            {activeTab === 'cancelled' && renderOrders(cancelled, { isCancelled: true })}
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
