import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './shared/Navbar';
import './ItemUpdate.css';

const ItemUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [itemData, setItemData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`${API_BASE}/item/${id}`);
        if (!res.ok) throw new Error('Failed to fetch item');
        const data = await res.json();
        setItemData({
          name: data.name || '',
          category: data.category || '',
          price: data.price || '',
          description: data.description || '',
        });
      } catch (err) {
        setError('Failed to load item details');
      }
    };
    fetchItem();
  }, [id]);

  const handleChange = (e) => {
    setItemData({ ...itemData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/item/update/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify(itemData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      alert('Item updated successfully!');
      navigate(`/item/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <Navbar />
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
            Price:
            <input type="number" name="price" value={itemData.price} onChange={handleChange} required min="0" />
          </label>
          <label>
            Description:
            <textarea name="description" value={itemData.description} onChange={handleChange} required />
          </label>
          <button type="submit" className="button button-update-item">Update</button>
        </form>
      </div>
    </div>
  );
};

export default ItemUpdate;
