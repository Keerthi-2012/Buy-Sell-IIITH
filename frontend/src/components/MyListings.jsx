import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Item } from './Item';
import { api, errorMessage } from '../utils/api';
import './Orders.css'; // reuses the tab styles from the orders page
import './BrowseItems.css'; // and the item grid

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'sold', label: 'Sold' },
];

// The seller's own listings in every status, so reserved and sold items aren't lost.
const MyListings = () => {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/item/mine')
      .then((res) => setItems(res.data))
      .catch((err) => toast.error(errorMessage(err, 'Could not load your listings')))
      .finally(() => setLoading(false));
  }, []);

  const count = (key) => (key === 'all' ? items.length : items.filter((i) => i.status === key).length);
  const shown = tab === 'all' ? items : items.filter((i) => i.status === tab);

  return (
    <div className="page-container">
      <h1 className="section-title">My Listings</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab-button ${tab === t.key ? 'active' : ''}`}
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : shown.length === 0 ? (
        <p>
          Nothing here yet. <Link to="/sellitem">List an item</Link>
        </p>
      ) : (
        <div className="item-grid">
          {shown.map((item) => (
            <Item key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListings;
