import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../utils/api';
import './SellItem.css';

const SellItem = () => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('new');
  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/item/categories')
      .then((res) => setCategoryOptions(res.data))
      .catch((err) => console.error('Failed to fetch categories:', err));
  }, []);

  const normalizeCategory = (cat) =>
    cat.trim().toLowerCase().replace(/\s+/g, '_');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAddingNewCategory && !newCategory.trim()) {
      toast.error('Please enter a new category name.');
      return;
    }

    const finalCategory = isAddingNewCategory ? normalizeCategory(newCategory) : category;

    try {
      await api.post('/item', {
        name,
        price: parseFloat(price),
        condition,
        category: finalCategory,
        description,
      });
      toast.success('Item listed successfully!');
      navigate('/browseitems');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create item'));
    }
  };

  return (
    <div>
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
              <label className="label">Description</label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a short description of the item"
                rows={4}
                required
              />
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
