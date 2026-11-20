import { Link } from 'react-router-dom';
import './Item.css';

// A single card in the browse grid; clicking opens the item page.
export const Item = ({ item }) => (
  <Link to={`/item/${item._id}`} className="item-link">
    <div className="item-card">
      <h2 className="item-title">{item.name}</h2>
      <p className="item-category">{item.category}</p>
      <p className="item-price">₹{item.price}</p>
      {item.quantity > 1 && <p className="item-category">{item.quantity} available</p>}
      {item.status && item.status !== 'available' && <p className="item-category">{item.status}</p>}
    </div>
  </Link>
);
