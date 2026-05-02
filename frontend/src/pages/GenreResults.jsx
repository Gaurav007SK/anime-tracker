import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import AnimeCard from '../components/AnimeCard';
import '../styles/GenreResults.css';

const GENRE_CONFIG = {
  'top-rated': {
    title: 'Top Rated',
    subtitle: 'The highest scoring anime across all categories.',
    type: 'top'
  },
  action: {
    title: 'Action Packed',
    subtitle: 'High energy battles and thrill rides.',
    type: 'genre',
    genreParam: 'action'
  },
  drama: {
    title: 'Emotional Dramas',
    subtitle: 'Character-driven stories with heart and tension.',
    type: 'genre',
    genreParam: 'drama'
  },
  fantasy: {
    title: 'Fantasy Worlds',
    subtitle: 'Magic systems, myths, and epic quests.',
    type: 'genre',
    genreParam: 'fantasy'
  },
  adventure: {
    title: 'Adventures',
    subtitle: 'Big journeys across new worlds.',
    type: 'genre',
    genreParam: 'adventure'
  },
  'slice-of-life': {
    title: 'Slice of Life',
    subtitle: 'Warm, grounded stories for calm nights.',
    type: 'genre',
    genreParam: 'slice_of_life'
  }
};

const PAGE_BATCH = 3;

function GenreResults() {
  const { genreKey } = useParams();
  const config = useMemo(() => GENRE_CONFIG[genreKey], [genreKey]);
  const [animeList, setAnimeList] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setAnimeList([]);
    setPage(1);
    setHasMore(true);
    if (config) {
      fetchPages(1, 1, true);
    } else {
      setLoading(false);
      setError('Genre not found.');
    }
  }, [config]);

  const fetchPages = async (startPage, count, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');

      let combined = [];
      let nextPage = startPage;
      let reachedEnd = false;

      for (let i = 0; i < count; i += 1) {
        let response;
        if (config.type === 'top') {
          response = await animeAPI.getTopAnime(nextPage);
        } else {
          response = await animeAPI.getAnimeByGenre(config.genreParam, nextPage);
        }

        const data = response.data?.data || [];
        if (!data.length) {
          reachedEnd = true;
          break;
        }

        combined = combined.concat(data);
        nextPage += 1;
      }

      setAnimeList((prev) => (startPage === 1 ? combined : [...prev, ...combined]));
      setHasMore(!reachedEnd);
      setPage(nextPage - 1);
    } catch (err) {
      console.error('Genre fetch error:', err);
      setError(err.response?.data?.error || 'Could not load this genre right now.');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="genre-results">
      <header className="genre-header">
        <div>
          <h2>{config?.title || 'Genre'}</h2>
          {config?.subtitle && <p>{config.subtitle}</p>}
        </div>
      </header>

      {error && (
        <div className="genre-error">
          <AlertTriangle size={18} aria-hidden="true" />
          {error}
        </div>
      )}

      {!error && animeList.length === 0 ? (
        <p className="genre-empty">No anime found for this genre yet.</p>
      ) : (
        <>
          <div className="genre-grid">
            {animeList.map((anime) => (
              <AnimeCard key={`${anime.id}-${anime.title}`} anime={anime} />
            ))}
          </div>

          {hasMore && (
            <div className="genre-actions">
              <button
                type="button"
                className="load-more-btn"
                onClick={() => fetchPages(page + 1, PAGE_BATCH)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GenreResults;
