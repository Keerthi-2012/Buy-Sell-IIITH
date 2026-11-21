import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { SellerRating, Stars } from './SellerRating';
import { api, errorMessage, fullName, rupees } from '../utils/api';
import { reportError } from '../utils/reportError';
import './ItemDetails.css';

const ItemDetails = () => {
  const user = useSelector((state) => state.auth.user);
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1); // how many the buyer wants
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Sellers get edit/delete; everyone else gets buy/cart.
  const isSeller = !!(item && user && item.seller?._id === user._id);
  // Buyers can only act while there are units left.
  const inStock = item?.quantity > 0;
  // Keep the chosen amount within 1..stock, even if the input is cleared or typed over.
  const wanted = Math.min(Math.max(Number(quantity) || 1, 1), item?.quantity || 1);

  useEffect(() => {
    api
      .get(`/item/${id}`)
      .then((res) => setItem(res.data))
      .catch((err) => setError(errorMessage(err, 'Could not load item details.')));
  }, [id]);

  // Once we know the seller, load their latest reviews (the rating summary came with the item).
  useEffect(() => {
    const sellerId = item?.seller?._id;
    if (!sellerId) return;
    api
      .get(`/review/seller/${sellerId}`)
      .then((res) => setReviews(res.data.reviews))
      .catch(() => setReviews([])); // reviews are a nice-to-have; the page works without them
  }, [item?.seller?._id]);

  // Guard for actions that need an account; sends guests to the login page.
  const requireLogin = (what) => {
    if (user) return true;
    toast.error(`You need to log in to ${what}.`);
    navigate('/login');
    return false;
  };

  // Adds this item to the cart and opens it.
  const handleAddToCart = async () => {
    if (!requireLogin('add items to your cart')) return;
    try {
      await api.post('/cart/add', { itemId: id, quantity: wanted });
      toast.success(`${item.name} added to cart`);
      navigate('/cart');
    } catch (err) {
      reportError(err, navigate, 'Could not add to cart');
    }
  };

  // The server works out buyer, seller and price itself; we only say which item.
  const handleBuyNow = async () => {
    if (!requireLogin('place an order')) return;
    try {
      await api.post('/order', { item: id, quantity: wanted });
      toast.success('Order placed! Your delivery OTP is on the Orders page.');
      navigate('/orders');
    } catch (err) {
      reportError(err, navigate, 'Order failed');
    }
  };

  // Seller-only; confirms before deleting.
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
          <p className="item-stock">{inStock ? `${item.quantity} available` : 'Out of stock'}</p>
          <p className="item-description">{item.description}</p>
          <p className="item-date">
            Posted by {fullName(item.seller)} on {new Date(item.createdAt).toLocaleDateString()}
          </p>

          <p className="item-date">
            Seller rating: <SellerRating summary={item.sellerRating} />
          </p>

          {!inStock && (
            <p className="error-message">
              {item.status === 'sold' ? 'This item has been sold.' : 'All remaining units are in pending orders.'}
            </p>
          )}

          {isSeller ? (
            <div className="button-group">
              <button onClick={() => navigate(`/update-item/${id}`)} className="button button-update-item">
                Update Item
              </button>
              <button onClick={handleDeleteItem} className="button button-delete-item">
                Delete Item
              </button>
            </div>
          ) : (
            inStock && (
              <div className="button-group">
                {item.quantity > 1 && (
                  <label>
                    Quantity:{' '}
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{ width: '4rem' }}
                    />
                  </label>
                )}
                <button onClick={handleAddToCart} className="button button-add-to-cart">
                  Add to Cart
                </button>
                <button onClick={handleBuyNow} className="button button-buy-now">
                  Buy Now
                </button>
              </div>
            )
          )}
          {reviews.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3>Recent reviews of this seller</h3>
              {reviews.slice(0, 3).map((r) => (
                <p key={r._id} className="item-description">
                  <Stars value={r.rating} /> {r.comment && `"${r.comment}"`}{' '}
                  <small>- {fullName(r.reviewer)}</small>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ItemDetails;
