import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Play,
  Star,
  Tv,
  Pause,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import '../styles/HeroCarousel.css';

const getDisplayTitle = (anime) => {
  const englishTitle = anime?.titleEnglish || anime?.title_english;

  if (typeof englishTitle === 'string' && englishTitle.trim()) {
    return englishTitle.trim();
  }

  return anime?.title || 'Untitled Anime';
};

function HeroCarousel({ animeList, isLoading }) {
  const scrollContainer = useRef(null);
  const autoScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const checkScroll = () => {
    if (scrollContainer.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  // Auto-scroll functionality
  useEffect(() => {
    if (!isHovered && !isLoading && animeList.length > 0) {
      autoScrollRef.current = setInterval(() => {
        const container = scrollContainer.current;
        if (container) {
          const scrollAmount = 350;
          const maxScroll = container.scrollWidth - container.clientWidth;

          if (container.scrollLeft >= maxScroll - 10) {
            // Loop back to start
            container.scrollTo({
              left: 0,
              behavior: 'smooth'
            });
          } else {
            container.scrollTo({
              left: container.scrollLeft + scrollAmount,
              behavior: 'smooth'
            });
          }

          setTimeout(checkScroll, 300);
        }
      }, 5000); // Auto-scroll every 5 seconds
    }

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [isHovered, isLoading, animeList.length]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction) => {
    const container = scrollContainer.current;
    if (container) {
      const scrollAmount = 350;
      const newScrollPosition =
        container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });

      setTimeout(checkScroll, 300);
    }
  };

  const handleCardClick = (animeId) => {
    navigate(`/anime/${animeId}`);
  };

  return (
    <div className="hero-carousel-wrapper">
      <div className="hero-carousel-header">
        <h2 className="hero-carousel-title">
          <Flame size={26} aria-hidden="true" />
          Trending Now
        </h2>
        <p className="hero-carousel-subtitle">Most watched right now across the community</p>
      </div>

      <div
        className="hero-carousel-container-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {canScrollLeft && (
          <button
            className="hero-carousel-btn hero-carousel-btn-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={30} />
          </button>
        )}

        <div
          className="hero-carousel-container"
          ref={scrollContainer}
          onScroll={checkScroll}
        >
          {isLoading ? (
            Array(6).fill(0).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="hero-carousel-item skeleton-item">
                <div className="hero-skeleton-card">
                  <div className="hero-skeleton-image"></div>
                  <div className="hero-skeleton-content">
                    <div className="hero-skeleton-title"></div>
                    <div className="hero-skeleton-subtitle"></div>
                    <div className="hero-skeleton-text"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            animeList.map((anime) => {
              const displayTitle = getDisplayTitle(anime);

              return (
                <div
                  key={anime.id}
                  className="hero-carousel-item"
                  onClick={() => handleCardClick(anime.id)}
                >
                  <div className="hero-card">
                    <div className="hero-card-image">
                      {anime.image ? (
                        <img src={anime.image} alt={displayTitle} />
                      ) : (
                        <div className="hero-card-no-image">No Image</div>
                      )}
                      <div className="hero-card-overlay">
                        <button className="hero-card-play-btn">
                          <Play size={16} aria-hidden="true" />
                          View
                        </button>
                      </div>
                      {anime.score && (
                        <div className="hero-card-score">
                          <Star size={14} aria-hidden="true" />
                          {anime.score.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="hero-card-content">
                      <h3 className="hero-card-title">{displayTitle}</h3>
                      {anime.genres && anime.genres.length > 0 && (
                        <div className="hero-card-genres">
                          {anime.genres.slice(0, 2).map((genre) => (
                            <span key={genre.id || genre.name} className="hero-card-genre-tag">
                              {genre.name || genre}
                            </span>
                          ))}
                        </div>
                      )}
                      {anime.episodes && (
                        <p className="hero-card-info">
                          <Tv size={14} aria-hidden="true" />
                          {anime.episodes} episodes
                        </p>
                      )}
                      {anime.status && (
                        <p className="hero-card-status">{anime.status}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {canScrollRight && (
          <button
            className="hero-carousel-btn hero-carousel-btn-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={30} />
          </button>
        )}
      </div>

      <div className="hero-carousel-footer">
        <p className="hero-carousel-indicator">
          <Pause size={14} aria-hidden="true" />
          Auto-scrolling • Hover to pause
        </p>
      </div>
    </div>
  );
}

export default HeroCarousel;
