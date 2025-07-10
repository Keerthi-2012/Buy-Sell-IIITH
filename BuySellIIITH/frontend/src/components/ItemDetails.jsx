import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './shared/Navbar';
import './ItemDetails.css';

const ItemDetails = () => {
  const user = useSelector((state) => state.auth.user);
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const isSeller = item && user && item.seller._id === user._id;

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`${API_BASE}/item/${id}`);
        if (!res.ok) throw new Error('Failed to fetch item');
        const data = await res.json();
        setItem(data);
      } catch (err) {
        setError('Could not load item details.');
        console.error(err);
      }
    };
    fetchItem();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) return alert("You need to login to add items to cart.");
    if (isSeller) return alert("You cannot add your own item to the cart.");

    try {
      const res = await fetch(`${API_BASE}/order/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: "include",
        body: JSON.stringify({ itemId: id, quantity: 1 }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add to cart");
      }

      alert(`${item.name} added to cart`);
      navigate("/cart");
    } catch (err) {
      console.error(err);
      alert("Could not add to cart");
    }
  };

  const handleBuyNow = async () => {
    if (!user) return alert("You need to login to place an order.");
    if (isSeller) return alert("You cannot buy your own item.");
    if (!item || !item._id || !item.price) return alert("Invalid item data.");

    try {
      const response = await fetch(`${API_BASE}/order/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          transactionId: crypto.randomUUID(),
          buyer: user._id,
          seller: item.seller._id,
          item: item._id,
          amount: item.price,
          otp: '123456', // Replace with real OTP logic later
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Order failed');

      alert('Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      console.error('Order failed:', err.message);
      setError('Order failed: ' + err.message);
    }
  };

  const handleUpdateItem = () => navigate(`/update-item/${id}`);

  const handleDeleteItem = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`${API_BASE}/item/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      alert('Item deleted successfully');
      navigate('/BrowseItems');
    } catch (err) {
      console.error(err);
      alert('Could not delete item');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="item-container">
        {error && <div className="error-message">{error}</div>}
        {!item ? (
          <div>Loading...</div>
        ) : (
          <>
            <h1 className="item-title">{item.name}</h1>
            <p className="item-category">Category: {item.category}</p>
            <p className="item-price">₹{item.price}</p>
            <p className="item-description">{item.description}</p>
            <p className="item-date">Posted on {new Date(item.createdAt).toLocaleDateString()}</p>

            {isSeller ? (
              <div className="button-group">
                <button onClick={handleUpdateItem} className="button button-update-item">
                  Update Item
                </button>
                <button onClick={handleDeleteItem} className="button button-delete-item">
                  Delete Item
                </button>
              </div>
            ) : (
              <div className="button-group">
                <button onClick={handleAddToCart} className="button button-add-to-cart">
                  Add to Cart
                </button>
                <button onClick={handleBuyNow} className="button button-buy-now">
                  Buy Now
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ItemDetails;