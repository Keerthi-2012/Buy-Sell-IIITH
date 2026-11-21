import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { FilterCard } from './FilterCard';
import { Item } from './Item';
import { api } from '../utils/api';
import './BrowseItems.css';

// How long typing must pause before we search; short enough to feel live, long enough to avoid a request per keystroke.
const TYPING_PAUSE_MS = 250;

const BrowseItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // The search text is mirrored in the URL so results can be shared and survive a refresh.
  const urlSearch = new URLSearchParams(location.search).get('search') || '';

  const [query, setQuery] = useState(urlSearch); // what is typed in the box right now
  const [search, setSearch] = useState(urlSearch); // what we actually search for
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const pushedToUrl = useRef(urlSearch); // the last search we wrote into the URL ourselves

  // Search as the user types (and deletes): each change restarts the short pause timer.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Enter or the magnifier button searches straight away instead of waiting for the pause.
  const searchNow = () => setSearch(query.trim());

  // Keep the URL in step with the search, replacing the entry so typing doesn't fill the back button.
  useEffect(() => {
    if (search === pushedToUrl.current) return;
    pushedToUrl.current = search;
    navigate(search ? `/browseitems?search=${encodeURIComponent(search)}` : '/browseitems', { replace: true });
  }, [search, navigate]);

  // If the URL changed from outside (back button, a link), follow it.
  useEffect(() => {
    if (urlSearch === pushedToUrl.current) return;
    pushedToUrl.current = urlSearch;
    setQuery(urlSearch);
    setSearch(urlSearch);
  }, [urlSearch]);

  // A new search starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Filters from FilterCard land here; any change goes back to page 1.
  const updateFilter = (type, value) => {
    if (type === 'category') setCategory(value);
    setPage(1);
  };

  // Refetch whenever the search, category or page changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/item', { params: { search, category, page } })
      .then((res) => !cancelled && setResult(res.data))
      .catch((err) => console.error('Failed to fetch items:', err))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setFirstLoad(false);
      });
    // ignore responses from superseded requests
    return () => {
      cancelled = true;
    };
  }, [search, category, page]);

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
            onKeyDown={(e) => e.key === 'Enter' && searchNow()}
            className="search-input"
          />
          <button onClick={searchNow} className="search-button" aria-label="Search">
            <Search size={18} />
          </button>
        </div>
      </div>
      <div className="browse-layout">
        <div className="browse-main">
          <div className="filter-section">
            <FilterCard onFilterChange={updateFilter} />
          </div>
          {/* While new results load, the old ones stay on screen (dimmed) so the page doesn't flash */}
          <div className={`items-section${loading && !firstLoad ? ' is-loading' : ''}`}>
            {firstLoad ? (
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
