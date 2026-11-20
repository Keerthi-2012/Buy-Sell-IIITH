import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FilterCard } from './FilterCard';
import { Item } from './Item';
import { api } from '../utils/api';
import './BrowseItems.css';

const BrowseItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('search') || '';

  const [query, setQuery] = useState(searchQuery);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Keep the input in sync with the URL, and restart from page 1 on a new search.
  useEffect(() => {
    setQuery(searchQuery);
    setPage(1);
  }, [searchQuery]);

  const searchProductHandler = () => {
    navigate(query.trim() ? `/browseitems?search=${encodeURIComponent(query.trim())}` : '/browseitems');
  };

  const updateFilter = (type, value) => {
    if (type === 'category') setCategory(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/item', { params: { search: searchQuery, category, page } })
      .then((res) => !cancelled && setResult(res.data))
      .catch((err) => console.error('Failed to fetch items:', err))
      .finally(() => !cancelled && setLoading(false));
    // ignore responses from superseded requests
    return () => {
      cancelled = true;
    };
  }, [searchQuery, category, page]);

  return (
    <div>
      <div className="browse-container">
        <h1 className="browse-heading">Search results ({result.total})</h1>
        <div className="search-bar-container">
          <input
            type="text"
            placeholder="Search items or categories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchProductHandler()}
            className="search-input"
          />
          <button onClick={searchProductHandler} className="search-button">
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
            {loading ? (
              <span>Loading...</span>
            ) : result.items.length === 0 ? (
              <span>Item Not Found</span>
            ) : (
              <>
                <div className="item-grid">
                  {result.items.map((item) => (
                    <Item key={item._id} item={item} />
                  ))}
                </div>
                {result.pages > 1 && (
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <span>
                      Page {page} of {result.pages}
                    </span>
                    <button disabled={page >= result.pages} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseItems;
