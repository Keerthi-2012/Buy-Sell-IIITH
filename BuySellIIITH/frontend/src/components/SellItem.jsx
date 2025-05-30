import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Navbar from './shared/Navbar';
import './SellItem.css'

const SellItem = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('new');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/item/categories');
        const data = await res.json();
        setCategoryOptions(data);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const normalizeCategory = (cat) =>
    cat.trim().toLowerCase().replace(/\s+/g, '_');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert("You're not logged in. Please log in to list an item.");
      return;
    }
    if (isAddingNewCategory && !newCategory.trim()) {
      alert('Please enter a new category name.');
      return;
    }

    const finalCategory = isAddingNewCategory
      ? normalizeCategory(newCategory)
      : category;

    const itemData = {
      name,
      price: parseFloat(price),
      condition,
      category: finalCategory,
    };

    console.log('Submitting item:', itemData);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/item/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ Send token for backend to authenticate
        },
        body: JSON.stringify(itemData),
      });



      const data = await res.json();
      console.log('Server response:', data);

      if (!res.ok) throw new Error(data.message || 'Failed to create item');

      alert('Item listed successfully!');
      navigate('/BrowseItems');

      // Reset form
      setName('');
      setPrice('');
      setCondition('new');
      setCategory('');
      setIsAddingNewCategory(false);
      setNewCategory('');
    } catch (err) {
      console.error('Error submitting item:', err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page-center-wrapper">
        <div className="sell-item-container">
          <h1 className="sell-item-title">Sell an Item</h1>
          <form onSubmit={handleSubmit} className="form-group">

            <div>
              <label className="label">Item Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Price (₹)</label>
              <input
                type="number"
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
              />
            </div>

            <div>
              <label className="label">Condition</label>
              <select
                className="select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>

            <div>
              <label className="label">Category</label>
              <select
                className="select"
                value={category}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__new__') {
                    setIsAddingNewCategory(true);
                    setCategory('');
                  } else {
                    setIsAddingNewCategory(false);
                    setCategory(value);
                  }
                }}
                required={!isAddingNewCategory}
              >
                <option value="">Select a category</option>
                {categoryOptions.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
                <option value="__new__">Add new category...</option>
              </select>
              {isAddingNewCategory && (
                <input
                  type="text"
                  placeholder="Enter new category"
                  className="input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required={isAddingNewCategory}
                />
              )}
            </div>

            <button type="submit" className="submit-button">
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellItem;
