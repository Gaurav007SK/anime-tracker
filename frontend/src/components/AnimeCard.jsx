import { Link } from 'react-router-dom';
import { Star, Tv } from 'lucide-react';
import '../styles/AnimeCard.css';

const getDisplayTitle = (anime) => {
  const englishTitle = anime?.titleEnglish || anime?.title_english;

  if (typeof englishTitle === 'string' && englishTitle.trim()) {
    return englishTitle.trim();
  }

  return anime?.title || 'Untitled Anime';
};

function AnimeCard({ anime }) {
  const displayTitle = getDisplayTitle(anime);

  return (
    <Link to={`/anime/${anime.id}`} className="anime-card-link">
      <div className="anime-card">
        <div className="anime-card-image">
          {anime.image ? (
            <img src={anime.image} alt={displayTitle} />
          ) : (
            <div className="no-image">No Image</div>
          )}
          {anime.score && (
            <div className="anime-score">
              <Star size={13} aria-hidden="true" />
              {anime.score.toFixed(1)}
            </div>
          )}
        </div>
        <div className="anime-card-content">
          <h3>{displayTitle}</h3>

          <div className="anime-card-meta">
            {anime.type && <span className="anime-chip">{anime.type}</span>}
            {anime.status && <span className="anime-chip anime-chip-muted">{anime.status}</span>}
          </div>

          {anime.episodes && (
            <p className="episodes">
              <Tv size={13} aria-hidden="true" />
              {anime.episodes} episodes
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default AnimeCard;
