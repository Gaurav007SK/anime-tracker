import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import AnimeCarousel from './AnimeCarousel';
import { throttler } from '../utils/requestThrottler';

function LazyLoadSection({ title, subtitle, icon, fetchData, seeMorePath }) {
  const SectionIcon = icon;

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (hasLoaded) return () => {};

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded && !isLoading) {
          loadData();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasLoaded, isLoading]);

  const loadData = async () => {
    if (hasLoaded || isLoading) return;
    try {
      setIsLoading(true);
      setError(null);

      // Use throttler to prevent rate limiting
      const result = await throttler.execute(fetchData);
      setData(result);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load anime. API rate limited. Try again in a moment.');

      // Retry after 3 seconds if rate limited
      if (error.response?.status === 429) {
        setTimeout(() => {
          setError(null);
          setHasLoaded(false);
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="carousel-section">
        <div className="carousel-header">
          <h2 className="carousel-title">
            {SectionIcon && <SectionIcon size={18} aria-hidden="true" />}
            <span>{title}</span>
          </h2>
          {subtitle && <p className="carousel-subtitle">{subtitle}</p>}
        </div>
        <div className="carousel-error">
          <AlertTriangle size={16} aria-hidden="true" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={sectionRef}>
      <AnimeCarousel
        title={title}
        subtitle={subtitle}
        icon={icon}
        animeList={data}
        isLoading={isLoading}
        seeMorePath={seeMorePath}
      />
    </div>
  );
}

export default LazyLoadSection;
