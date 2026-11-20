import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import './ItemDetails.css';

const ItemDetails = () => {
  const user = useSelector((state) => state.auth.user);
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isSeller = !!(item && user && item.seller?._id === user._id);
  const isAvailable = item?.status === 'available';

  useEffect(() => {
    api
      .get(`/item/${id}`)
      .then((res) => setItem(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load item details.')));
  }, [id]);

  const requireLogin = (what) => {
    if (user) return true;
    toast.error(`You need to log in to ${what}.`);
    navigate('/login');
    return false;
  };

  const handleAddToCart = async () => {
    if (!requireLogin('add items to your cart')) return;
    try {
      await api.post('/cart/add', { itemId: id });
      toast.success(`${item.name} added to cart`);
      navigate('/cart');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add to cart'));
    }
  };

  // The server works out buyer, seller and price itself; we only say which item.
  const handleBuyNow = async () => {
    if (!requireLogin('place an order')) return;
    try {
      await api.post('/order', { item: id });
      toast.success('Order placed! Your delivery OTP is on the Orders page.');
      navigate('/orders');
    } catch (err) {
      toast.error(errorMessage(err, 'Order failed'));
    }
  };

  const handleDeleteItem = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/item/${id}`);
      toast.success('Item deleted');
      navigate('/browseitems');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete item'));
    }
  };

  return (
    <div className="item-container">
      {error && <div className="error-message">{error}</div>}
      {!item ? (
        !error && <div>Loading...</div>
      ) : (
        <>
          <h1 className="item-title">{item.name}</h1>
          <p className="item-category">Category: {item.category?.replace(/_/g, ' ')}</p>
          <p className="item-category">Condition: {item.condition}</p>
          <p className="item-price">{rupees(item.price)}</p>
          <p className="item-description">{item.description}</p>
          <p className="item-date">
            Posted by {fullName(item.seller)} on {new Date(item.createdAt).toLocaleDateString()}
          </p>

          {!isAvailable && (
            <p className="error-message">
              {item.status === 'sold' ? 'This item has been sold.' : 'This item has a pending order.'}
            </p>
          )}

          {isSeller ? (
            <div className="button-group">
              {isAvailable && (
                <>
                  <button onClick={() => navigate(`/update-item/${id}`)} className="button button-update-item">
                    Update Item
                  </button>
                  <button onClick={handleDeleteItem} className="button button-delete-item">
                    Delete Item
                  </button>
                </>
              )}
            </div>
          ) : (
            isAvailable && (
              <div className="button-group">
                <button onClick={handleAddToCart} className="button button-add-to-cart">
                  Add to Cart
                </button>
                <button onClick={handleBuyNow} className="button button-buy-now">
                  Buy Now
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};

export default ItemDetails;
