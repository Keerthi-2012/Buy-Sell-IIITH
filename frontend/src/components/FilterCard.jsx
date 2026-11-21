import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import './FilterCard.css';

export const FilterCard = ({ onFilterChange }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Load the categories that currently have items for sale.
  useEffect(() => {
    api
      .get('/item/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('Failed to fetch categories', err));
  }, []);

  // Picks a category, or clears the filter ('') and tells the page to refetch.
  const choose = (value) => {
    setSelectedCategory(value);
    onFilterChange('category', value);
  };

  // Clicking the selected category again switches it off; clicking another one switches to it.
  const toggleCategory = (cat) => choose(selectedCategory === cat ? '' : cat);

  return (
    <div className="filter-card">
      <div className="filter-header">
        <h1 className="filter-title">Filters</h1>
        {selectedCategory && (
          <button type="button" className="filter-clear" onClick={() => choose('')}>
            Clear
          </button>
        )}
      </div>
      <hr className="filter-divider" />

      {categories.length > 0 && (
        <>
          <h1 className="filter-section-title">Category</h1>
          {categories.map((cat) => {
            const formatted = cat.replace(/_/g, ' ');
            return (
              <div key={cat} className="filter-option">
                <input
                  type="checkbox"
                  id={`category-${cat}`}
                  checked={selectedCategory === cat}
                  onChange={() => toggleCategory(cat)}
                />
                <label htmlFor={`category-${cat}`} className="filter-label">
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
