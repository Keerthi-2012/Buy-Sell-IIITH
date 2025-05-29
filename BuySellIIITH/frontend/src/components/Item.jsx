import React from 'react';
import { Link } from 'react-router-dom';
import './Item.css'; // Add this import

export const Item = ({ item }) => (
  <Link to={`/item/${item._id}`} className="item-link">
    <div className="item-card">
      <h2 className="item-title">{item.name}</h2>
      <p className="item-category">{item.category}</p>
      <p className="item-price">₹{item.price}</p>
    </div>
  </Link>
);
