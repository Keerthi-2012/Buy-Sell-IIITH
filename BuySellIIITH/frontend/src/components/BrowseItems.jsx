import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from './shared/Navbar';
import { FilterCard } from './FilterCard';
import { Item } from './Item';
import { Search } from 'lucide-react';
import './BrowseItems.css'; // 🔹 CSS Import

const BrowseItems = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    price: '',
    condition: '',
  });

  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search');

  // 🔄 Keep input field in sync with URL query param
  useEffect(() => {
    setQuery(searchQuery || '');
  }, [searchQuery]);

  const searchProductHandler = () => {
    // ✅ Navigate with or without search param
    navigate(
      query.trim()
        ? `/BrowseItems?search=${encodeURIComponent(query)}`
        : '/BrowseItems'
    );
  };

  const updateFilter = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        let url = 'http://localhost:8000/api/v1/item';
        const queryParams = new URLSearchParams();

        if (searchQuery) queryParams.append('search', searchQuery);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.price) queryParams.append('price', filters.price);
        if (filters.condition) queryParams.append('condition', filters.condition);

        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      }
    };

    fetchItems();
  }, [filters, searchQuery]);

  return (
    <div>
      <Navbar />
      <div className="browse-container">
        <h1 className="browse-heading">Search results ({items.length})</h1>
        <div className="search-bar-container">
          <input
            type="text"
            placeholder="Search items, sellers or categories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchProductHandler();
              }
            }}
            className="search-input"
          />
          <button
            onClick={searchProductHandler}
            className="search-button"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="browse-layout">
        <div className="browse-main">
          <div className="filter-section">
            <FilterCard onFilterChange={updateFilter} />
          </div>
          <div className="items-section">
            {items.length === 0 ? (
              <span>Item Not Found</span>
            ) : (
              <div className="item-grid">
                {items.map((item) => (
                  <Item key={item._id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseItems;
