import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SearchX, X } from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import AnimeCard from '../components/AnimeCard';
import '../styles/SearchResults.css';

const SEARCH_PAGE_LIMIT = 25;

const SORT_OPTIONS = [
  { value: 'score:desc', label: 'Highest Score' },
  { value: 'score:asc', label: 'Lowest Score' },
  { value: 'popularity:asc', label: 'Most Popular' },
  { value: 'popularity:desc', label: 'Least Popular' },
  { value: 'members:desc', label: 'Most Members' }
];

function SearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const query = (searchParams.get('q') || '').trim();
  const genreParam = (searchParams.get('genre') || '').trim();
  const themeParam = (searchParams.get('theme') || '').trim();
  const sortParam = (searchParams.get('sort') || 'score:desc').trim().toLowerCase();

  const [searchInput, setSearchInput] = useState(query);
  const [selectedGenreIds, setSelectedGenreIds] = useState(genreParam ? genreParam.split(',') : []);
  const [selectedThemeIds, setSelectedThemeIds] = useState(themeParam ? themeParam.split(',') : []);
  const [selectedSort, setSelectedSort] = useState(sortParam);

  const [genres, setGenres] = useState([]);
  const [themes, setThemes] = useState([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const [genreSearchInput, setGenreSearchInput] = useState('');
  const [themeSearchInput, setThemeSearchInput] = useState('');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    setSearchInput(query);
    setSelectedGenreIds(genreParam ? genreParam.split(',') : []);
    setSelectedThemeIds(themeParam ? themeParam.split(',') : []);
    setSelectedSort(sortParam);
  }, [query, genreParam, themeParam, sortParam]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    const hasCriteria = query || selectedGenreIds.length > 0 || selectedThemeIds.length > 0;
    if (hasCriteria) {
      fetchSearchResults(1, true);
    } else {
      setLoading(false);
      setError('');
      setResults([]);
      setPage(1);
      setHasNextPage(false);
      setTotalResults(0);
    }
  }, [query, selectedGenreIds, selectedThemeIds, selectedSort]);

  const fetchFilters = async () => {
    try {
      setFiltersLoading(true);
      const response = await animeAPI.getSearchFilters();
      setGenres(response.data?.data?.genres || []);
      setThemes(response.data?.data?.themes || []);
    } catch (err) {
      console.error('Search filters error:', err);
      setGenres([]);
      setThemes([]);
    } finally {
      setFiltersLoading(false);
    }
  };

  const fetchSearchResults = async (targetPage = 1, resetResults = false) => {
    try {
      if (targetPage === 1 || resetResults) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError('');
      const [orderBy, sort] = selectedSort.split(':');
      const response = await animeAPI.searchAnime(query, targetPage, SEARCH_PAGE_LIMIT, {
        genre: selectedGenreIds.join(','),
        theme: selectedThemeIds.join(','),
        orderBy,
        sort
      });

      const animeData = response.data?.data || [];

      if (!Array.isArray(animeData)) {
        setError('Unexpected response format from server.');
        setResults([]);
        setHasNextPage(false);
        return;
      }

      setResults((prev) => {
        if (resetResults || targetPage === 1) {
          return animeData;
        }

        const seenIds = new Set(prev.map((item) => item.id));
        const incoming = animeData.filter((item) => !seenIds.has(item.id));
        return [...prev, ...incoming];
      });

      setPage(targetPage);
      setHasNextPage(Boolean(response.data?.hasNextPage));
      setTotalResults(response.data?.total || animeData.length);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Error fetching search results. Please try again.');
      if (targetPage === 1 || resetResults) {
        setResults([]);
        setHasNextPage(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const nextParams = new URLSearchParams();
    if (searchInput.trim()) nextParams.set('q', searchInput.trim());
    if (selectedGenreIds.length > 0) nextParams.set('genre', selectedGenreIds.join(','));
    if (selectedThemeIds.length > 0) nextParams.set('theme', selectedThemeIds.join(','));
    if (selectedSort !== 'score:desc') nextParams.set('sort', selectedSort);

    navigate(`/search?${nextParams.toString()}`);
  };

  const toggleGenreId = (id) => {
    setSelectedGenreIds((prev) =>
      prev.includes(String(id))
        ? prev.filter((item) => item !== String(id))
        : [...prev, String(id)]
    );
  };

  const toggleThemeId = (id) => {
    setSelectedThemeIds((prev) =>
      prev.includes(String(id))
        ? prev.filter((item) => item !== String(id))
        : [...prev, String(id)]
    );
  };

  const removeGenreId = (id) => {
    setSelectedGenreIds((prev) => prev.filter((item) => item !== String(id)));
  };

  const removeThemeId = (id) => {
    setSelectedThemeIds((prev) => prev.filter((item) => item !== String(id)));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSelectedGenreIds([]);
    setSelectedThemeIds([]);
    setSelectedSort('score:desc');
    navigate('/search');
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
      fetchSearchResults(page + 1, false);
    }
  };

  const handleRetry = () => {
    fetchSearchResults(1, true);
  };

  const selectedGenreItems = selectedGenreIds
    .map((id) => genres.find((genre) => String(genre.id) === String(id)))
    .filter(Boolean);

  const selectedThemeItems = selectedThemeIds
    .map((id) => themes.find((theme) => String(theme.id) === String(id)))
    .filter(Boolean);

  const filteredGenres = genres.filter((g) =>
    g.name.toLowerCase().includes(genreSearchInput.toLowerCase())
  );

  const filteredThemes = themes.filter((t) =>
    t.name.toLowerCase().includes(themeSearchInput.toLowerCase())
  );

  return (
    <div className="search-results">
      <div className="search-results-header">
        <h2>
          <Search size={20} aria-hidden="true" />
          Search & Discover
        </h2>
        <p>Find your next favorite anime by title, genre, or theme.</p>
      </div>

      <form className="search-panel" onSubmit={handleSearchSubmit}>
        <div className="search-input-row">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            className="search-input"
            placeholder="Search anime titles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="search-submit-btn">Search</button>
        </div>

        <div className="search-filters-row">
          {/* Genre Filter */}
          <div className="filter-section">
            <button
              type="button"
              className="filter-trigger"
              onClick={() => setGenreModalOpen(true)}
              disabled={filtersLoading}
            >
              <span className="filter-label">Genre</span>
              <span className="filter-count">{selectedGenreIds.length}</span>
            </button>
            {selectedGenreItems.length > 0 && (
              <div className="filter-chips">
                {selectedGenreItems.map((genre) => (
                  <div key={genre.id} className="chip">
                    {genre.name}
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeGenreId(genre.id)}
                      aria-label={`Remove ${genre.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Theme Filter */}
          <div className="filter-section">
            <button
              type="button"
              className="filter-trigger"
              onClick={() => setThemeModalOpen(true)}
              disabled={filtersLoading}
            >
              <span className="filter-label">Theme</span>
              <span className="filter-count">{selectedThemeIds.length}</span>
            </button>
            {selectedThemeItems.length > 0 && (
              <div className="filter-chips">
                {selectedThemeItems.map((theme) => (
                  <div key={theme.id} className="chip">
                    {theme.name}
                    <button
                      type="button"
                      className="chip-remove"
                      onClick={() => removeThemeId(theme.id)}
                      aria-label={`Remove ${theme.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="filter-section sort-section">
            <label htmlFor="sort-select">
              <span className="filter-label">Sort By</span>
            </label>
            <select
              id="sort-select"
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="sort-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="search-panel-actions">
          <button type="button" className="clear-filters-btn" onClick={handleClearFilters}>
            Clear All
          </button>
        </div>
      </form>

      {/* Genre Modal */}
      {genreModalOpen && (
        <div className="filter-modal-overlay" onClick={() => {
          setGenreModalOpen(false);
          setGenreSearchInput('');
        }}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Select Genres</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setGenreModalOpen(false);
                  setGenreSearchInput('');
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="filter-modal-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                className="filter-modal-search-input"
                placeholder="Search genres..."
                value={genreSearchInput}
                onChange={(e) => setGenreSearchInput(e.target.value)}
              />
              {genreSearchInput && (
                <button
                  type="button"
                  className="filter-modal-search-clear"
                  onClick={() => setGenreSearchInput('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="filter-modal-content">
              {filtersLoading ? (
                <p className="loading-text">Loading genres...</p>
              ) : filteredGenres.length > 0 ? (
                <div className="checkbox-list">
                  {filteredGenres.map((genre) => (
                    <label key={genre.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedGenreIds.includes(String(genre.id))}
                        onChange={() => toggleGenreId(genre.id)}
                      />
                      <span>{genre.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No genres found</p>
              )}
            </div>
            <div className="filter-modal-footer">
              <button
                type="button"
                className="modal-apply-btn"
                onClick={() => {
                  setGenreModalOpen(false);
                  setGenreSearchInput('');
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {themeModalOpen && (
        <div className="filter-modal-overlay" onClick={() => {
          setThemeModalOpen(false);
          setThemeSearchInput('');
        }}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Select Themes</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setThemeModalOpen(false);
                  setThemeSearchInput('');
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="filter-modal-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                className="filter-modal-search-input"
                placeholder="Search themes..."
                value={themeSearchInput}
                onChange={(e) => setThemeSearchInput(e.target.value)}
              />
              {themeSearchInput && (
                <button
                  type="button"
                  className="filter-modal-search-clear"
                  onClick={() => setThemeSearchInput('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="filter-modal-content">
              {filtersLoading ? (
                <p className="loading-text">Loading themes...</p>
              ) : filteredThemes.length > 0 ? (
                <div className="checkbox-list">
                  {filteredThemes.map((theme) => (
                    <label key={theme.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedThemeIds.includes(String(theme.id))}
                        onChange={() => toggleThemeId(theme.id)}
                      />
                      <span>{theme.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No themes found</p>
              )}
            </div>
            <div className="filter-modal-footer">
              <button
                type="button"
                className="modal-apply-btn"
                onClick={() => {
                  setThemeModalOpen(false);
                  setThemeSearchInput('');
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button type="button" className="search-retry-btn" onClick={handleRetry}>
                Retry Search
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <p className="no-results">
              <SearchX size={18} aria-hidden="true" />
              {(query || selectedGenreIds.length > 0 || selectedThemeIds.length > 0)
                ? 'No anime found. Try a different search or filters.'
                : 'Start by searching for an anime title or selecting a filter.'}
            </p>
          ) : (
            <>
              <p className="result-count">Showing {results.length} of {totalResults} results</p>
              <div className="anime-grid">
                {results.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} />
                ))}
              </div>

              <div className="search-actions">
                {hasNextPage ? (
                  <button
                    type="button"
                    className="load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading more...' : 'Load More'}
                  </button>
                ) : (
                  <p className="search-end-note">You have reached the end of the results.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SearchResults;
