import { Link } from 'react-router-dom';
import './Item.css';

// A single card in the browse grid; clicking opens the item page.
export const Item = ({ item }) => (
  <Link to={`/item/${item._id}`} className="item-link">
    <div className="item-card">
      <h2 className="item-title">{item.name}</h2>
      <p className="item-category">{item.category?.replace(/_/g, ' ')}</p>
      {item.quantity > 1 && <p className="item-stock">{item.quantity} available</p>}
      {item.status && item.status !== 'available' && (
        <span className={`badge badge-${item.status}`}>{item.status}</span>
      )}
      <p className="item-price">₹{item.price}</p>
    </div>
  </Link>
);
