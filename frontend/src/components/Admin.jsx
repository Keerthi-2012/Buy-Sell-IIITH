import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import './Orders.css'; // reuses the tab and card styles from the orders page

const STATUS_OPTIONS = {
  orders: ['pending', 'completed', 'cancelled'],
  items: ['available', 'reserved', 'sold'],
};

// Moderation view: every order and every listing on the platform.
const Admin = () => {
  const [tab, setTab] = useState('orders');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/${tab}`, { params: { status, page } });
      setData(res.data);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load admin data'));
    } finally {
      setLoading(false);
    }
  }, [tab, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching tab changes what the status filter means, so reset it and go back to page 1.
  const switchTab = (next) => {
    setTab(next);
    setStatus('');
    setPage(1);
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}"? Any pending order on it will be cancelled.`)) return;
    try {
      await api.delete(`/admin/items/${item._id}`);
      toast.success('Listing removed');
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove listing'));
    }
  };

  const rows = tab === 'orders' ? data.orders : data.items;

  return (
    <div className="page-container">
      <h1 className="section-title">Admin</h1>

      <div className="tabs">
        {['orders', 'items'].map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`tab-button ${tab === t ? 'active' : ''}`}
          >
            {t === 'orders' ? 'All Orders' : 'All Listings'}
          </button>
        ))}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {STATUS_OPTIONS[tab].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="orders-list">
        {loading ? (
          <p>Loading...</p>
        ) : rows.length === 0 ? (
          <p>Nothing to show.</p>
        ) : tab === 'orders' ? (
          rows.map((o) => (
            <div key={o._id} className="order-card">
              <h2>{o.item?.name ?? o.itemName}</h2>
              <p>
                {rupees(o.amount)}{o.quantity > 1 ? ` (${o.quantity} units)` : ''} · {o.status}
                {o.cancelReason ? ` (${o.cancelReason})` : ''}
              </p>
              <p>Buyer: {fullName(o.buyer)} ({o.buyer?.email})</p>
              <p>Seller: {fullName(o.seller)} ({o.seller?.email})</p>
              <p>Placed: {new Date(o.createdAt).toLocaleString()}</p>
            </div>
          ))
        ) : (
          rows.map((i) => (
            <div key={i._id} className="order-card">
              <h2>{i.name}</h2>
              <p>
                {rupees(i.price)} · {i.quantity} in stock · {i.status} · {i.category?.replace(/_/g, ' ')}
              </p>
              <p>Seller: {fullName(i.seller)} ({i.seller?.email})</p>
              <button className="cancel-btn" onClick={() => removeItem(i)}>
                Remove listing
              </button>
            </div>
          ))
        )}
      </div>

      {data.pages > 1 && (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Admin;
