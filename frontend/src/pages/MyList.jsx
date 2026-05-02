import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LibraryBig, NotebookTabs } from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import { useAuth } from '../context/AuthContext';
import UserAnimeCard from '../components/UserAnimeCard';
import '../styles/MyList.css';

const normalizeStatus = (status) => {
  switch (status) {
    case 'currently-watching':
    case 'watching':
      return 'currently-watching';
    case 'watched-this-year':
    case 'completed':
      return 'watched-this-year';
    case 'wishlist':
    case 'plan-to-watch':
      return 'wishlist';
    case 'on-hold':
    case 'dropped':
      return 'wishlist';
    default:
      return 'wishlist';
  }
};

function MyList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [myList, setMyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightAnimeId, setHighlightAnimeId] = useState(null);

  useEffect(() => {
    fetchMyList();
  }, []);

  useEffect(() => {
    const targetId = location.state?.highlightAnimeId;
    if (!targetId) return;

    setHighlightAnimeId(targetId);
    const timer = setTimeout(() => {
      setHighlightAnimeId(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.state?.highlightAnimeId]);

  const enrichListTitles = async (list) => {
    const needsEnglish = list.filter((item) => !item.titleEnglish && item.animeId);
    if (!needsEnglish.length) return;

    const updates = await Promise.all(needsEnglish.map(async (item) => {
      try {
        const response = await animeAPI.getAnimeDetails(item.animeId);
        const details = response.data?.data;
        const titleEnglish = details?.titleEnglish || null;
        const titleJapanese = details?.titleJapanese || null;

        if (!titleEnglish && !titleJapanese) {
          return null;
        }

        return {
          id: item._id,
          titleEnglish,
          titleJapanese
        };
      } catch (err) {
        console.error('Error fetching title data:', err);
        return null;
      }
    }));

    const validUpdates = updates.filter(Boolean);
    if (!validUpdates.length) return;

    setMyList((prev) => prev.map((item) => {
      const match = validUpdates.find((update) => update.id === item._id);
      if (!match) return item;

      return {
        ...item,
        titleEnglish: match.titleEnglish,
        titleJapanese: match.titleJapanese
      };
    }));

    await Promise.all(validUpdates.map((update) =>
      animeAPI.updateProgress(update.id, {
        titleEnglish: update.titleEnglish,
        titleJapanese: update.titleJapanese
      })
    ));
  };

  const fetchMyList = async () => {
    try {
      setLoading(true);
      const response = await animeAPI.getMyList();
      const list = response.data.data || [];
      setMyList(list);
      enrichListTitles(list);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate('/login', {
          replace: true,
          state: { message: 'Session expired. Please login again.' }
        });
        return;
      }
      setError('Error fetching your list');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await animeAPI.removeFromList(id);
      setMyList(myList.filter((anime) => anime._id !== id));
    } catch (err) {
      console.error('Error removing anime:', err);
    }
  };

  const handleUpdateProgress = async (id, data, anime) => {
    try {
      const nextData = { ...data };
      const response = await animeAPI.updateProgress(id, nextData);
      const updatedAnime = response.data?.data;

      setMyList((prev) => prev.map((item) => {
        if (item._id !== id) return item;

        return {
          ...item,
          ...nextData,
          ...(updatedAnime ? { ...updatedAnime } : {})
        };
      }));
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const currentYear = new Date().getFullYear();
  const normalizedList = myList.map((anime) => ({
    ...anime,
    normalizedStatus: normalizeStatus(anime.status)
  }));
  const sections = [
    {
      key: 'currently-watching',
      label: 'Currently Watching',
      helper: 'In-progress picks you are actively watching.'
    },
    {
      key: 'watched-this-year',
      label: `Watched This Year (${currentYear})`,
      helper: 'Completed titles logged this year.'
    },
    {
      key: 'wishlist',
      label: 'Wishlist',
      helper: 'Saved for later or queued up next.'
    }
  ].map((section) => ({
    ...section,
    items: normalizedList.filter((anime) => anime.normalizedStatus === section.key)
  }));

  const handleOpenAnime = (anime) => {
    const animeId = anime?.animeId || anime?.id;
    if (!animeId) return;
    navigate(`/anime/${animeId}`);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="my-list">
      <h2>
        <LibraryBig size={22} aria-hidden="true" />
        My Anime List
      </h2>

      {error && <div className="error-message">{error}</div>}

      {myList.length === 0 ? (
        <p className="empty-list">
          <NotebookTabs size={18} aria-hidden="true" />
          Your list is empty. Start adding anime.
        </p>
      ) : (
        <>
          <div className="my-list-sections">
            {sections.map((section) => (
              <section key={section.key} className="list-section">
                <div className="list-section-header">
                  <div>
                    <h3 className="list-section-title">{section.label}</h3>
                    <p className="list-section-helper">{section.helper}</p>
                  </div>
                  <span className="list-section-count">{section.items.length}</span>
                </div>

                {section.items.length === 0 ? (
                  <p className="list-section-empty">No anime here yet.</p>
                ) : (
                  <div className="list-grid">
                    {section.items.map((anime) => {
                      const isHighlighted = highlightAnimeId
                        ? Number(anime.animeId || anime.id) === Number(highlightAnimeId)
                        : false;

                      return (
                        <UserAnimeCard
                          key={anime._id}
                          anime={anime}
                          onOpen={handleOpenAnime}
                          onRemove={() => handleRemove(anime._id)}
                          onUpdate={(data) => handleUpdateProgress(anime._id, data, anime)}
                          showProgress={section.key === 'currently-watching'}
                          showCompletedBadge={section.key === 'watched-this-year'}
                          showStartWatching={section.key === 'wishlist'}
                          isHighlighted={isHighlighted}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MyList;
