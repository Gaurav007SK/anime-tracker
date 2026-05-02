import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import AnimeCard from './AnimeCard';
import '../styles/AnimeCarousel.css';

function AnimeCarousel({ title, subtitle, icon: Icon, animeList, isLoading, seeMorePath }) {
  const scrollContainer = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainer.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction) => {
    const container = scrollContainer.current;
    if (container) {
      const scrollAmount = 400;
      const newScrollPosition =
        container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });

      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="carousel-section">
      <div className="carousel-header">
        <div className="carousel-header-main">
          <h2 className="carousel-title">
            {Icon && <Icon size={18} aria-hidden="true" />}
            <span>{title}</span>
          </h2>
          {subtitle && <p className="carousel-subtitle">{subtitle}</p>}
        </div>
        {seeMorePath ? (
          <Link to={seeMorePath} className="carousel-see-more">
            See more
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="carousel-wrapper">
        {canScrollLeft && (
          <button
            className="carousel-btn carousel-btn-left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          className="carousel-container"
          ref={scrollContainer}
          onScroll={checkScroll}
        >
          {isLoading ? (
            Array(8).fill(0).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="carousel-item skeleton-item">
                <div className="skeleton-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-text"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <>
              {animeList.map((anime) => (
                <div key={anime.id} className="carousel-item">
                  <AnimeCard anime={anime} />
                </div>
              ))}
              {seeMorePath && animeList.length > 0 ? (
                <div className="carousel-item see-more-item">
                  <Link to={seeMorePath} className="see-more-card">
                    <span>See more</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>

        {canScrollRight && (
          <button
            className="carousel-btn carousel-btn-right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export default AnimeCarousel;
