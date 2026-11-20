import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../utils/api';
import './ItemUpdate.css';

const ItemUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState({
    name: '',
    category: '',
    price: '',
    quantity: 1,
    description: '',
    condition: 'used',
  });
  const [error, setError] = useState('');

  // Pre-fill the form with the item's current values.
  useEffect(() => {
    api
      .get(`/item/${id}`)
      .then(({ data }) =>
        setItemData({
          name: data.name || '',
          category: data.category || '',
          price: data.price ?? '',
          quantity: data.quantity ?? 1,
          description: data.description || '',
          condition: data.condition || 'used',
        })
      )
      .catch(() => setError('Failed to load item details'));
  }, [id]);

  const handleChange = (e) => setItemData({ ...itemData, [e.target.name]: e.target.value });

  // Sends the edits; price is converted from the input string to a number.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/item/${id}`, { ...itemData, price: Number(itemData.price), quantity: Number(itemData.quantity) });
      toast.success('Item updated');
      navigate(`/item/${id}`);
    } catch (err) {
      setError(errorMessage(err, 'Update failed'));
    }
  };

  return (
    <div className="update-item-container">
      <h2>Update Item</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" name="name" value={itemData.name} onChange={handleChange} required />
        </label>
        <label>
          Category:
          <input type="text" name="category" value={itemData.category} onChange={handleChange} required />
        </label>
        <label>
          Condition:
          <select name="condition" value={itemData.condition} onChange={handleChange}>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </label>
        <label>
          Price:
          <input type="number" name="price" value={itemData.price} onChange={handleChange} required min="0" />
        </label>
        <label>
          Quantity in stock:
          <input type="number" name="quantity" value={itemData.quantity} onChange={handleChange} required min="0" max="1000" step="1" />
        </label>
        <label>
          Description:
          <textarea name="description" value={itemData.description} onChange={handleChange} required />
        </label>
        <button type="submit" className="button button-update-item">Update</button>
      </form>
    </div>
  );
};

export default ItemUpdate;
