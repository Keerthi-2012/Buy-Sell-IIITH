import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './FilterCard.css';

export const FilterCard = ({ onFilterChange }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    api
      .get('/item/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('Failed to fetch categories', err));
  }, []);

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategory(value);
    onFilterChange('category', value);
  };

  return (
    <div className="filter-card">
      <h1 className="filter-title">Filters</h1>
      <hr className="filter-divider" />

      {categories.length > 0 && (
        <>
          <h1 className="filter-section-title">Category</h1>
          {categories.map((cat, idx) => {
            const formatted = cat.replace(/_/g, ' ');
            return (
              <div key={idx} className="radio-option">
                <input
                  type="radio"
                  id={`category-${cat}`}
                  name="category"
                  value={cat}
                  checked={selectedCategory === cat}
                  onChange={handleCategoryChange}
                />
                <label htmlFor={`category-${cat}`} className="radio-label">
                  {formatted.charAt(0).toUpperCase() + formatted.slice(1)}
                </label>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
