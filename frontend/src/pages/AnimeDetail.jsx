import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star,
  Tv,
  Radio,
  CalendarDays,
  Check,
  CirclePlus,
  Tags,
  Building2,
  ScrollText,
  Trophy,
  Users,
  Clock3,
  ExternalLink,
  Play,
  Languages,
  Hash,
  Layers,
  Sparkles,
  MessageSquareText,
  ShieldAlert,
  ThumbsUp,
  Heart,
  Laugh
} from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import { useAuth } from '../context/AuthContext';
import AnimeCard from '../components/AnimeCard';
import FetchErrorState from '../components/FetchErrorState';
import '../styles/AnimeDetail.css';

const LIST_STATUS_OPTIONS = [
  { value: 'currently-watching', label: 'Currently Watching' },
  { value: 'watched-this-year', label: 'Watched This Year' },
  { value: 'wishlist', label: 'Wishlist' }
];

const STAR_COUNT = 5;
const QUICK_ADD_STAR_VALUES = [1, 2, 3, 4, 5];
const STAR_STEP = 0.25;
const SYNOPSIS_COLLAPSE_HEIGHT = 132;
const REVIEW_PREVIEW_LENGTH = 420;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hasJapaneseCharacters = (value) => /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(value);

const formatReviewDate = (isoDate) => {
  if (!isoDate) {
    return 'Unknown date';
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStarValueFromPointer = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const pointerX = event.clientX ?? rect.left;
  const ratio = clamp((pointerX - rect.left) / rect.width, 0, 1);
  const rawStarValue = ratio * STAR_COUNT;

  if (rawStarValue <= 0) {
    return 0;
  }

  const steppedStarValue = clamp(Math.ceil(rawStarValue / STAR_STEP) * STAR_STEP, STAR_STEP, STAR_COUNT);
  return Number(steppedStarValue.toFixed(2));
};

function AnimeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isInList, setIsInList] = useState(false);
  const [relatedSeasons, setRelatedSeasons] = useState([]);
  const [similarAnime, setSimilarAnime] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedRequested, setRelatedRequested] = useState(false);
  const [relatedError, setRelatedError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsRequested, setReviewsRequested] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsHasNextPage, setReviewsHasNextPage] = useState(false);
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState({});
  const [revealedSpoilerIds, setRevealedSpoilerIds] = useState({});
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [hideReviewsList, setHideReviewsList] = useState(false);
  const synopsisRef = useRef(null);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isSynopsisClippable, setIsSynopsisClippable] = useState(false);
  const [isMobileSynopsisView, setIsMobileSynopsisView] = useState(false);
  const [addForm, setAddForm] = useState({
    status: 'wishlist',
    progress: 0,
    rating: '',
    notes: ''
  });

  const progressError = useMemo(() => {
    if (addForm.status === 'wishlist') return '';

    const progressValue = Number(addForm.progress);
    if (!Number.isFinite(progressValue)) return 'Progress must be a number.';
    if (progressValue < 0) return 'Progress cannot be negative.';
    if (anime?.episodes && progressValue > anime.episodes) {
      return `Progress cannot exceed ${anime.episodes} episodes.`;
    }

    return '';
  }, [addForm.progress, addForm.status, anime?.episodes]);

  const fetchAnimeDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await animeAPI.getAnimeDetails(id);
      setAnime(response.data.data);
    } catch (err) {
      setError('Error fetching anime details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setShowQuickAdd(false);
    setHoverRating(0);
    setAddForm({
      status: 'wishlist',
      progress: 0,
      rating: '',
      notes: ''
    });
    setFeedback('');
  }, [id]);

  useEffect(() => {
    fetchAnimeDetails();
  }, [fetchAnimeDetails]);

  useEffect(() => {
    setIsSynopsisExpanded(false);

    if (!anime?.synopsis || typeof window === 'undefined') {
      setIsSynopsisClippable(false);
      setIsMobileSynopsisView(false);
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 520px)');

    const updateSynopsisState = () => {
      const isMobile = mediaQuery.matches;
      const synopsisElement = synopsisRef.current;

      setIsMobileSynopsisView(isMobile);

      if (!isMobile || !synopsisElement) {
        setIsSynopsisClippable(false);
        return;
      }

      setIsSynopsisClippable(synopsisElement.scrollHeight > SYNOPSIS_COLLAPSE_HEIGHT);
    };

    updateSynopsisState();

    const handleResize = () => {
      window.requestAnimationFrame(updateSynopsisState);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleResize);
    } else {
      mediaQuery.addListener(handleResize);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleResize);
      } else {
        mediaQuery.removeListener(handleResize);
      }

      window.removeEventListener('resize', handleResize);
    };
  }, [anime?.synopsis]);

  useEffect(() => {
    setRelatedSeasons([]);
    setSimilarAnime([]);
    setRelatedRequested(false);
    setRelatedLoading(false);
    setRelatedError('');
    setReviews([]);
    setReviewsRequested(false);
    setReviewsLoading(false);
    setReviewsError('');
    setReviewsPage(0);
    setReviewsHasNextPage(false);
    setReviewsLoadingMore(false);
    setExpandedReviewIds({});
    setRevealedSpoilerIds({});
    setShowAllReviews(false);
    setHideReviewsList(false);
  }, [id]);

  const fetchReviews = useCallback(async () => {
    if (reviewsLoading) {
      return;
    }

    try {
      setReviewsRequested(true);
      setReviewsLoading(true);
      setReviewsError('');

      const response = await animeAPI.getAnimeReviews(id, 1);
      const fetchedReviews = response.data?.data || [];
      setReviews(fetchedReviews);
      setReviewsPage(response.data?.page || 1);
      setReviewsHasNextPage(Boolean(response.data?.hasNextPage));
      setShowAllReviews(false);
      setHideReviewsList(false);
    } catch (err) {
      setReviews([]);
      setReviewsError('Could not load reviews right now.');
      setReviewsPage(0);
      setReviewsHasNextPage(false);
      console.error('Error fetching anime reviews:', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [id, reviewsLoading]);

  const fetchMoreReviews = useCallback(async () => {
    if (reviewsLoading || reviewsLoadingMore || !reviewsHasNextPage) {
      return;
    }

    const nextPage = Math.max(1, reviewsPage + 1);

    try {
      setReviewsLoadingMore(true);

      const response = await animeAPI.getAnimeReviews(id, nextPage);
      const fetchedReviews = response.data?.data || [];
      const returnedPage = response.data?.page || nextPage;

      setReviews((prev) => {
        const seenIds = new Set(prev.map((item) => item.id));
        const uniqueIncoming = fetchedReviews.filter((item) => !seenIds.has(item.id));
        return [...prev, ...uniqueIncoming];
      });

      setReviewsPage(returnedPage);
      setReviewsHasNextPage(Boolean(response.data?.hasNextPage));
      setReviewsError('');
    } catch (err) {
      setReviewsError('Could not load more reviews right now.');
      console.error('Error fetching more anime reviews:', err);
    } finally {
      setReviewsLoadingMore(false);
    }
  }, [id, reviewsHasNextPage, reviewsLoading, reviewsLoadingMore, reviewsPage]);

  const fetchRelated = useCallback(async () => {
    if (relatedLoading) {
      return;
    }

    try {
      setRelatedRequested(true);
      setRelatedLoading(true);
      setRelatedError('');

      const response = await animeAPI.getRelatedAnime(id);
      const seasons = response.data?.data?.seasons || [];
      const similar = response.data?.data?.similar || [];

      setRelatedSeasons(seasons);
      setSimilarAnime(similar);
    } catch (err) {
      setRelatedSeasons([]);
      setSimilarAnime([]);
      setRelatedError('Could not load related shows right now.');
      console.error('Error fetching related anime:', err);
    } finally {
      setRelatedLoading(false);
    }
  }, [id, relatedLoading]);

  useEffect(() => {
    if (!user) {
      setIsInList(false);
      return;
    }

    let isActive = true;
    const checkInList = async () => {
      try {
        const response = await animeAPI.getMyList();
        const list = response.data.data || [];
        const targetId = Number(id);
        const exists = list.some((item) => Number(item.animeId) === targetId);

        if (isActive) {
          setIsInList(exists);
        }
      } catch (err) {
        if (isActive) {
          setIsInList(false);
        }
        console.error('Error checking list:', err);
      }
    };

    checkInList();

    return () => {
      isActive = false;
    };
  }, [user, id]);

  const handleOpenQuickAdd = () => {
    if (!anime) return;

    if (!user) {
      navigate('/login', { state: { from: `/anime/${id}` } });
      return;
    }

    setHoverRating(0);
    setShowQuickAdd((prev) => !prev);
    setFeedback('');
  };

  const handleViewInList = () => {
    if (!anime) return;
    navigate('/my-list', { state: { highlightAnimeId: anime.id } });
  };

  const setRatingFromStarValue = (starValue) => {
    const normalizedStarValue = clamp(starValue, 0, STAR_COUNT);
    const normalizedScore = Number((normalizedStarValue * 2).toFixed(1));

    setAddForm((prev) => ({
      ...prev,
      rating: normalizedScore === 0 ? '' : normalizedScore
    }));
  };

  const handleRatingKeyDown = (event) => {
    const currentStarValue = addForm.rating === '' ? 0 : Number(addForm.rating) / 2;

    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setRatingFromStarValue(currentStarValue + STAR_STEP);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setRatingFromStarValue(currentStarValue - STAR_STEP);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setRatingFromStarValue(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setRatingFromStarValue(STAR_COUNT);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setRatingFromStarValue(0);
    }
  };

  const updateFormStatus = (nextStatus) => {
    setAddForm((prev) => {
      let nextProgress = prev.progress;
      let nextRating = prev.rating;

      if (nextStatus === 'watched-this-year' && anime?.episodes) {
        nextProgress = anime.episodes;
      }

      if (nextStatus === 'wishlist') {
        nextProgress = 0;
        nextRating = '';
      }

      return {
        ...prev,
        status: nextStatus,
        progress: nextProgress,
        rating: nextRating
      };
    });
  };

  const handleAddToList = async () => {
    if (!anime) return;

    if (progressError) {
      setFeedback(progressError);
      return;
    }

    const totalEpisodes = anime.episodes || null;
    const parsedProgress = Number.isFinite(Number(addForm.progress))
      ? Math.max(0, Number(addForm.progress))
      : 0;
    const normalizedProgress = totalEpisodes
      ? Math.min(parsedProgress, totalEpisodes)
      : parsedProgress;

    const parsedRating = addForm.status === 'wishlist' || addForm.rating === ''
      ? undefined
      : Number(addForm.rating);

    const payload = {
      animeId: anime.id,
      title: anime.title,
      titleEnglish: anime.titleEnglish,
      titleJapanese: anime.titleJapanese,
      image: anime.image,
      score: anime.score,
      episodes: anime.episodes,
      status: addForm.status,
      progress: normalizedProgress,
      ...(Number.isFinite(parsedRating) ? { rating: parsedRating } : {}),
      ...(addForm.notes.trim() ? { notes: addForm.notes.trim() } : {})
    };

    try {
      setAdding(true);
      setFeedback('');
      const response = await animeAPI.addToList(payload);
      setFeedback(response.data?.message || 'Saved to your list.');
      setShowQuickAdd(false);
      setHoverRating(0);
      setIsInList(true);
    } catch (err) {
      setFeedback(err.response?.status === 401
        ? 'Please login to add anime to your list.'
        : 'Could not add this anime right now.');
      console.error('Error:', err);
    } finally {
      setAdding(false);
    }
  };

  const trailerEmbedUrl = useMemo(() => {
    if (anime?.trailer?.youtubeId) {
      return `https://www.youtube.com/embed/${anime.trailer.youtubeId}`;
    }

    return anime?.trailer?.embedUrl || null;
  }, [anime]);

  const headingTitle = useMemo(() => {
    if (!anime) {
      return '';
    }

    if (anime.titleEnglish && anime.titleEnglish.trim()) {
      return anime.titleEnglish.trim();
    }

    if (anime.title && anime.title.trim()) {
      return anime.title.trim();
    }

    return 'Untitled Anime';
  }, [anime]);

  const japaneseSubtitleTitle = useMemo(() => {
    if (!anime) {
      return '';
    }

    if (anime.titleJapanese && anime.titleJapanese.trim()) {
      const japaneseTitle = anime.titleJapanese.trim();

      if (japaneseTitle !== headingTitle) {
        return japaneseTitle;
      }
    }

    if (anime.title && anime.title.trim()) {
      const mainTitle = anime.title.trim();

      if (mainTitle !== headingTitle && hasJapaneseCharacters(mainTitle)) {
        return mainTitle;
      }
    }

    return '';
  }, [anime, headingTitle]);

  const importantInfo = useMemo(() => ([
    // {
    //   label: 'Score',
    //   value: anime?.score ? `${anime.score}/10` : 'N/A',
    //   icon: Star
    // },
    // {
    //   label: 'Rank',
    //   value: anime?.rank ? `#${anime.rank}` : 'N/A',
    //   icon: Trophy
    // },
    {
      label: 'Popularity',
      value: anime?.popularity ? `#${anime.popularity}` : 'N/A',
      icon: Hash
    },
    // {
    //   label: 'Members',
    //   value: anime?.members ? anime.members.toLocaleString() : 'N/A',
    //   icon: Users
    // },
    {
      label: 'Episodes',
      value: anime?.episodes || 'N/A',
      icon: Tv
    },
    {
      label: 'Duration',
      value: anime?.duration || 'N/A',
      icon: Clock3
    },
    {
      label: 'Status',
      value: anime?.status || 'N/A',
      icon: Radio
    },
    {
      label: 'Aired',
      value: anime?.aired || 'N/A',
      icon: CalendarDays
    }
  ]), [anime]);

  const heroBadges = useMemo(() => {
    const badges = [];

    if (anime?.score) {
      badges.push({
        label: 'Score',
        value: `${anime.score}/10`,
        icon: Star
      });
    }

    if (anime?.rank) {
      badges.push({
        label: 'Rank',
        value: `#${anime.rank}`,
        icon: Trophy
      });
    }

    if (anime?.members) {
      badges.push({
        label: 'Members',
        value: anime.members.toLocaleString(),
        icon: Users
      });
    }

    return badges;
  }, [anime]);

  const selectedStarCount = addForm.rating === '' ? 0 : Number(addForm.rating) / 2;
  const displayedStarCount = hoverRating || selectedStarCount;
  const displayedScore = Number((displayedStarCount * 2).toFixed(1));
  const fillPercentage = clamp((displayedStarCount / STAR_COUNT) * 100, 0, 100);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const toggleReviewExpanded = (reviewId) => {
    setExpandedReviewIds((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  const toggleReviewSpoiler = (reviewId) => {
    setRevealedSpoilerIds((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    document.title = headingTitle ? `${headingTitle} | Anime Tracker` : 'Otaku Control Room';

    return () => {
      document.title = 'Otaku Control Room';
    };
  }, [headingTitle]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !anime) {
    return (
      <div className="error-message">
        <FetchErrorState
          message={error || 'Anime not found'}
          onRetry={fetchAnimeDetails}
          retryLabel="Try Again"
        />
      </div>
    );
  }

  const backdropStyle = anime?.image ? { backgroundImage: `url(${anime.image})` } : undefined;

  return (
    <div className="anime-detail-page">
      <div className="anime-backdrop-layer" style={backdropStyle} aria-hidden="true"></div>
      <div className="anime-backdrop-overlay" aria-hidden="true"></div>

      <div className="anime-detail">
        <div className="detail-shell">
          <div className="detail-container">
            <div className="detail-image">
              <img src={anime.image} alt={headingTitle} />
            </div>

            <div className="detail-info">
              <p className="detail-kicker">
                {anime.type || 'Anime'}
                {anime.year ? ` • ${anime.year}` : ''}
                {anime.season ? ` • ${anime.season}` : ''}
              </p>

              <h1>{headingTitle}</h1>
              {japaneseSubtitleTitle && <p className="detail-alt-title">{japaneseSubtitleTitle}</p>}

              {heroBadges.length > 0 && (
                <div className="headline-badges">
                  {heroBadges.map((item) => {
                    const Icon = item.icon;

                    return (
                      <span key={item.label} className="headline-badge">
                        <Icon size={14} aria-hidden="true" />
                        <strong>{item.value}</strong>
                        <small>{item.label}</small>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="detail-meta-grid">
                {importantInfo.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article key={item.label} className="detail-meta-card">
                      <span className="detail-meta-icon">
                        <Icon size={15} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="detail-meta-label">{item.label}</p>
                        <p className="detail-meta-value">{item.value}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              {anime.source && (
                <p className="detail-source">
                  <Languages size={14} aria-hidden="true" />
                  Source: {anime.source}
                </p>
              )}

              {anime.genres && anime.genres.length > 0 && (
                <div className="genres">
                  <strong>
                    <Tags size={14} aria-hidden="true" />
                    Genres
                  </strong>
                  <div className="genre-tags">
                    {anime.genres.map((genre) => (
                      <span key={genre.id || genre.name} className="genre-tag">
                        {typeof genre === 'string' ? genre : genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {anime.studios && anime.studios.length > 0 && (
                <div className="studios">
                  <strong>
                    <Building2 size={14} aria-hidden="true" />
                    Studios:
                  </strong>
                  {anime.studios.join(', ')}
                </div>
              )}

              <div className="detail-actions">
                {user && isInList ? (
                  <button
                    onClick={handleViewInList}
                    className="view-list-btn"
                    type="button"
                  >
                    <CirclePlus size={16} aria-hidden="true" />
                    View in My List
                  </button>
                ) : (
                  <button
                    onClick={handleOpenQuickAdd}
                    disabled={adding || !anime}
                    className="add-btn"
                    type="button"
                  >
                    <CirclePlus size={16} aria-hidden="true" />
                    {user ? 'Add to List' : 'Login to Add'}
                  </button>
                )}

                {anime.trailer?.url && (
                  <a
                    href={anime.trailer.url}
                    target="_blank"
                    rel="noreferrer"
                    className="trailer-link-btn"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Open Trailer on YouTube
                  </a>
                )}
              </div>

              {showQuickAdd && !isInList && (
                <div className="quick-add-panel">
                  <p className="quick-add-title">Quick Add Settings</p>

                  <div className="quick-add-status-row">
                    {LIST_STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`status-pill${addForm.status === option.value ? ' active' : ''}`}
                        onClick={() => updateFormStatus(option.value)}
                      >
                        {addForm.status === option.value ? <Check size={13} aria-hidden="true" /> : null}
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="quick-add-grid">
                    {addForm.status !== 'wishlist' ? (
                      <label className="quick-add-field" htmlFor="quick-add-progress">
                        <span>Progress</span>
                        <input
                          id="quick-add-progress"
                          type="number"
                          min="0"
                          max={anime.episodes || undefined}
                          value={addForm.progress}
                          className={progressError ? 'input-error' : undefined}
                          aria-invalid={progressError ? 'true' : 'false'}
                          onChange={(e) => {
                            const rawValue = e.target.value;

                            setAddForm((prev) => ({
                              ...prev,
                              progress: rawValue === '' ? 0 : Number(rawValue)
                            }));
                          }}
                        />
                        {progressError ? (
                          <small className="quick-add-error-text">{progressError}</small>
                        ) : (anime.episodes ? <small>Out of {anime.episodes} episodes</small> : null)}
                      </label>
                    ) : null}

                    {addForm.status !== 'wishlist' ? (
                      <div className="quick-add-field quick-add-rating-field">
                        <span>Your Rating</span>
                        <div className="quick-add-stars-row">
                          <div
                            className="quick-add-stars"
                            role="slider"
                            tabIndex={0}
                            aria-label="Your rating"
                            aria-valuemin={0}
                            aria-valuemax={10}
                            aria-valuenow={addForm.rating === '' ? 0 : Number(addForm.rating)}
                            aria-valuetext={addForm.rating === '' ? 'No rating selected' : `${Number(addForm.rating)} out of 10`}
                            onMouseMove={(event) => {
                              const nextStars = getStarValueFromPointer(event);
                              setHoverRating(nextStars);
                            }}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={(event) => {
                              const nextStars = getStarValueFromPointer(event);
                              setRatingFromStarValue(nextStars);
                              setHoverRating(0);
                            }}
                            onKeyDown={handleRatingKeyDown}
                          >
                            <div className="quick-add-stars-track quick-add-stars-track-base" aria-hidden="true">
                              {QUICK_ADD_STAR_VALUES.map((starValue) => (
                                <Star key={`base-${starValue}`} size={18} />
                              ))}
                            </div>

                            <div
                              className="quick-add-stars-track quick-add-stars-track-fill"
                              style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
                              aria-hidden="true"
                            >
                              {QUICK_ADD_STAR_VALUES.map((starValue) => (
                                <Star key={`fill-${starValue}`} size={18} fill="currentColor" />
                              ))}
                            </div>
                          </div>

                          <span className="quick-add-rating-value">
                            {displayedScore > 0 ? `${displayedScore.toFixed(1).replace('.0', '')}/10` : 'Not rated'}
                          </span>

                          <button
                            type="button"
                            className="quick-add-clear-rating"
                            onClick={() => {
                              setRatingFromStarValue(0);
                              setHoverRating(0);
                            }}
                            disabled={addForm.rating === ''}
                          >
                            Clear
                          </button>
                        </div>
                        <small>
                          Tap or click anywhere on the stars for quarter-star precision (e.g. 9.5/10).
                        </small>
                      </div>
                    ) : null}
                  </div>

                  <label className="quick-add-field quick-add-notes" htmlFor="quick-add-notes">
                    <span>Notes</span>
                    <textarea
                      id="quick-add-notes"
                      rows="2"
                      placeholder="Optional note"
                      value={addForm.notes}
                      onChange={(e) => {
                        setAddForm((prev) => ({
                          ...prev,
                          notes: e.target.value
                        }));
                      }}
                    ></textarea>
                  </label>

                  <div className="quick-add-actions">
                    <button
                      type="button"
                      className="quick-add-cancel"
                      onClick={() => {
                        setShowQuickAdd(false);
                        setHoverRating(0);
                      }}
                      disabled={adding}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="quick-add-save"
                      onClick={handleAddToList}
                      disabled={adding || Boolean(progressError)}
                    >
                      {adding ? 'Saving...' : 'Save to My List'}
                    </button>
                  </div>
                </div>
              )}

              {feedback && <p className="detail-feedback">{feedback}</p>}
            </div>
          </div>

          <div className={`detail-content-grid${trailerEmbedUrl ? '' : ' no-trailer'}`}>
            {anime.synopsis && (
              <div className="synopsis">
                <h3>
                  <ScrollText size={16} aria-hidden="true" />
                  Story Snapshot
                </h3>
                <p
                  ref={synopsisRef}
                  className={
                    isMobileSynopsisView && isSynopsisClippable && !isSynopsisExpanded
                      ? 'synopsis-copy is-clamped'
                      : 'synopsis-copy'
                  }
                >
                  {anime.synopsis}
                </p>

                {isMobileSynopsisView && isSynopsisClippable && (
                  <button
                    type="button"
                    className="synopsis-toggle"
                    onClick={() => setIsSynopsisExpanded((currentValue) => !currentValue)}
                  >
                    {isSynopsisExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {trailerEmbedUrl && (
              <section className="trailer-section">
                <h3>
                  <Play size={16} aria-hidden="true" />
                  Official Trailer
                </h3>

                <div className="trailer-frame-wrap">
                  <iframe
                    src={trailerEmbedUrl}
                    title={`${anime.title} trailer`}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                </div>
              </section>
            )}
          </div>

          <section className="detail-related review-section">
            <div className="detail-related-header">
              <h3>
                <MessageSquareText size={16} aria-hidden="true" />
                Community Reviews
              </h3>
            </div>

            {!reviewsRequested && (
              <button type="button" className="view-list-btn" onClick={fetchReviews}>
                Show Reviews
              </button>
            )}

            {reviewsLoading && (
              <div className="detail-related-loading">Loading reviews...</div>
            )}

            {reviewsRequested && !reviewsLoading && reviewsError && (
              <FetchErrorState
                message={reviewsError}
                onRetry={fetchReviews}
                retryLabel="Try Again"
                className="detail-related-error"
              />
            )}

            {reviewsRequested && !reviewsLoading && !reviewsError && reviews.length === 0 && (
              <div className="detail-related-loading">No reviews available for this anime yet.</div>
            )}

            {reviewsRequested && !reviewsLoading && !reviewsError && reviews.length > 0 && (
              <>
                <div className="review-list-controls">
                  <button
                    type="button"
                    className="review-expand-btn"
                    onClick={() => setHideReviewsList((currentValue) => !currentValue)}
                  >
                    {hideReviewsList ? 'Show Reviews' : 'Hide Reviews'}
                  </button>

                  <span className="review-count-note">
                    {hideReviewsList
                      ? `${reviews.length} reviews loaded`
                      : `Showing ${displayedReviews.length} of ${reviews.length}`}
                  </span>
                </div>

                {!hideReviewsList && (
                  <div className="review-list">
                    {displayedReviews.map((item) => {
                  const isExpanded = Boolean(expandedReviewIds[item.id]);
                  const isSpoilerLocked = item.isSpoiler && !revealedSpoilerIds[item.id];
                  const reviewText = String(item.review || '');
                  const isLong = reviewText.length > REVIEW_PREVIEW_LENGTH;
                  const previewText = isLong && !isExpanded
                    ? `${reviewText.slice(0, REVIEW_PREVIEW_LENGTH).trim()}...`
                    : reviewText;

                      return (
                        <article key={item.id} className="review-card">
                      <header className="review-card-header">
                        <div className="review-user">
                          <img
                            src={item.user?.image || 'https://cdn.myanimelist.net/images/kaomoji_mal_white.png'}
                            alt={item.user?.username || 'Reviewer avatar'}
                            className="review-user-avatar"
                            loading="lazy"
                          />
                          <div>
                            <p className="review-username">{item.user?.username || 'Unknown user'}</p>
                            <p className="review-date">{formatReviewDate(item.date)}</p>
                          </div>
                        </div>

                        <div className="review-meta">
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <span className="review-tag">{item.tags[0]}</span>
                          )}
                          {item.score ? <span className="review-score">{item.score}/10</span> : null}
                          {item.isSpoiler ? (
                            <span className="review-spoiler">
                              <ShieldAlert size={13} aria-hidden="true" />
                              Spoiler
                            </span>
                          ) : null}
                        </div>
                      </header>

                      <p className={`review-text${isSpoilerLocked ? ' is-spoiler-locked' : ''}`}>
                        {previewText}
                      </p>

                      <div className="review-actions">
                        {item.isSpoiler && (
                          <button
                            type="button"
                            className="review-expand-btn"
                            onClick={() => toggleReviewSpoiler(item.id)}
                          >
                            {isSpoilerLocked ? 'Show Spoiler' : 'Hide Spoiler'}
                          </button>
                        )}

                        {isLong && (
                          <button
                            type="button"
                            className="review-expand-btn"
                            onClick={() => toggleReviewExpanded(item.id)}
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}

                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer" className="review-open-link">
                            Open
                          </a>
                        )}
                      </div>

                          <div className="review-reactions">
                            <span><ThumbsUp size={14} aria-hidden="true" /> {item.reactions?.nice || 0}</span>
                            <span><Heart size={14} aria-hidden="true" /> {item.reactions?.loveIt || 0}</span>
                            <span><Laugh size={14} aria-hidden="true" /> {item.reactions?.funny || 0}</span>
                            <span className="review-reactions-overall">Overall {item.reactions?.overall || 0}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {!hideReviewsList && (
                  <div className="review-pagination-actions">
                    {reviews.length > 2 && (
                      <button
                        type="button"
                        className="review-expand-btn"
                        onClick={() => setShowAllReviews((currentValue) => !currentValue)}
                      >
                        {showAllReviews ? 'Show fewer reviews' : `Show all reviews (${reviews.length})`}
                      </button>
                    )}

                    {reviewsHasNextPage ? (
                      <button
                        type="button"
                        className="review-expand-btn"
                        onClick={fetchMoreReviews}
                        disabled={reviewsLoadingMore}
                      >
                        {reviewsLoadingMore ? 'Loading more reviews...' : 'Load More Reviews'}
                      </button>
                    ) : (
                      <p className="review-pagination-note">You have reached the end of available reviews.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {(!relatedRequested || relatedLoading || relatedError || (relatedSeasons.length === 0 && similarAnime.length === 0)) && (
            <section className="detail-related">
              <div className="detail-related-header">
                <h3>
                  <Sparkles size={16} aria-hidden="true" />
                  Related Universe
                </h3>
                
              </div>

              {!relatedRequested && (
                <button type="button" className="view-list-btn" onClick={fetchRelated}>
                  Show Prequel, Sequel & Similar Anime
                </button>
              )}

              {relatedLoading && (
                <div className="detail-related-loading">Loading related anime...</div>
              )}

              {relatedRequested && !relatedLoading && relatedError && (
                <FetchErrorState
                  message={relatedError}
                  onRetry={fetchRelated}
                  retryLabel="Try Again"
                  className="detail-related-error"
                />
              )}

              {relatedRequested && !relatedLoading && !relatedError && relatedSeasons.length === 0 && similarAnime.length === 0 && (
                <div className="detail-related-loading">No related anime found.</div>
              )}
            </section>
          )}

          {/* Other Seasons Section */}
          {relatedRequested && !relatedLoading && relatedSeasons.length > 0 && (
            <section className="detail-related">
              <div className="detail-related-header">
                <h3>
                  <Layers size={16} aria-hidden="true" />
                  Other Seasons
                </h3>
                <p>Continue the story across sequels and prequels.</p>
              </div>

              <div className="other-seasons-container">
                {relatedSeasons.some((s) => s.type === 'Prequel') && (
                  <div className="season-subsection">
                    <h4>Prequel</h4>
                    <ul className="season-list">
                      {relatedSeasons
                        .filter((s) => s.type === 'Prequel')
                        .map((item) => (
                          <li key={item.id}>
                            <a href={`/anime/${item.id}`} className="season-link">
                              {item.title}
                            </a>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {relatedSeasons.some((s) => s.type === 'Sequel') && (
                  <div className="season-subsection">
                    <h4>Sequel</h4>
                    <ul className="season-list">
                      {relatedSeasons
                        .filter((s) => s.type === 'Sequel')
                        .map((item) => (
                          <li key={item.id}>
                            <a href={`/anime/${item.id}`} className="season-link">
                              {item.title}
                            </a>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Similar Anime Section */}
          {relatedRequested && !relatedLoading && similarAnime.length > 0 && (
            <section className="detail-related">
              <div className="detail-related-header">
                <h3>
                  <Sparkles size={16} aria-hidden="true" />
                  Similar Anime
                </h3>
                <p>More shows with similar vibes and themes.</p>
              </div>

              <div className="detail-related-grid">
                {similarAnime.map((item) => (
                  <AnimeCard key={item.id} anime={item} />
                ))}
              </div>
            </section>
          )}

          {anime.rating && (
            <p className="viewer-rating-note">
              <Star size={14} aria-hidden="true" />
              Content rating: {anime.rating}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnimeDetail;
