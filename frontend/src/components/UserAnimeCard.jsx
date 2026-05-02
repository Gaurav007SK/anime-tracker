import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Trash2, Star, Tv } from 'lucide-react';
import '../styles/UserAnimeCard.css';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const hasJapaneseCharacters = (value) => /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(value);

const getDisplayTitle = (anime) => {
  const english = anime?.titleEnglish || anime?.title_english;
  if (english && english.trim()) return english.trim();
  if (anime?.title && anime.title.trim()) return anime.title.trim();
  return 'Untitled Anime';
};

const getJapaneseSubtitle = (anime, heading) => {
  const jp = anime?.titleJapanese || anime?.title_japanese;
  if (jp && jp.trim() && jp.trim() !== heading) return jp.trim();
  if (anime?.title && anime.title.trim() !== heading && hasJapaneseCharacters(anime.title)) return anime.title.trim();
  return '';
};

const getProgressLabel = (anime) => {
  const progress = Number.isFinite(Number(anime?.progress)) ? Number(anime.progress) : 0;
  const total = Number.isFinite(Number(anime?.episodes)) ? Number(anime.episodes) : null;

  if (total && total > 0) {
    return `${progress}/${total}`;
  }

  return `${progress} eps`;
};

function UserAnimeCard({
  anime,
  onRemove,
  onUpdate,
  onOpen,
  showProgress = false,
  showCompletedBadge = false,
  showStartWatching = false,
  isHighlighted = false
}) {
  const cardRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const displayTitle = getDisplayTitle(anime);
  const japaneseSubtitle = getJapaneseSubtitle(anime, displayTitle);
  const progressLabel = getProgressLabel(anime);
  const totalEpisodes = Number.isFinite(Number(anime?.episodes)) ? Number(anime.episodes) : null;
  const currentProgress = Number.isFinite(Number(anime?.progress)) ? Number(anime.progress) : 0;
  const isAtMaxEpisodes = totalEpisodes ? currentProgress >= totalEpisodes : false;

  const handleOpen = () => {
    if (onOpen) {
      onOpen(anime);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen();
    }
  };

  const handleProgressChange = (delta) => {
    if (!onUpdate) return;
    const maxEpisodes = Number.isFinite(Number(anime?.episodes)) ? Number(anime.episodes) : Number.MAX_SAFE_INTEGER;
    const nextProgress = clamp(currentProgress + delta, 0, maxEpisodes);
    onUpdate({ progress: nextProgress });
  };

  const handleMarkCompleted = () => {
    if (!onUpdate) return;
    if (!totalEpisodes) return;
    onUpdate({ status: 'watched-this-year', progress: totalEpisodes });
  };

  const handleStartWatching = () => {
    if (!onUpdate) return;
    onUpdate({ status: 'currently-watching' });
  };

  const openConfirm = (type) => {
    const actions = {
      remove: {
        title: 'Remove from list?',
        message: 'This will remove the anime from your list. You can add it again anytime.',
        confirmLabel: 'Remove',
        variant: 'danger'
      },
      start: {
        title: 'Start watching?',
        message: 'This will move the anime to Currently Watching.',
        confirmLabel: 'Start Watching',
        variant: 'primary'
      },
      complete: {
        title: 'Mark as completed?',
        message: 'This will move the anime to Watched This Year.',
        confirmLabel: 'Mark Completed',
        variant: 'success'
      }
    };

    if (!actions[type]) return;
    setConfirmAction({ type, ...actions[type] });
  };

  const closeConfirm = () => setConfirmAction(null);

  const handleConfirm = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'remove') {
      onRemove?.();
    }

    if (confirmAction.type === 'start') {
      handleStartWatching();
    }

    if (confirmAction.type === 'complete') {
      handleMarkCompleted();
    }

    setConfirmAction(null);
  };

  useEffect(() => {
    if (!isHighlighted || !cardRef.current) return;
    cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isHighlighted]);

  return (
    <article
      className={`user-anime-card${isHighlighted ? ' highlight' : ''}`}
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="card-image">
        {anime.image ? (
          <img src={anime.image} alt={displayTitle} loading="lazy" />
        ) : (
          <div className="no-image">No Image</div>
        )}
      </div>

      <div className="card-content">
        <div className="card-top">
          <h3>{displayTitle}</h3>
          {japaneseSubtitle ? (
            <p className="card-subtitle">{japaneseSubtitle}</p>
          ) : (
            <p className="card-subtitle card-subtitle-spacer" aria-hidden="true">&nbsp;</p>
          )}
        </div>

        <div className="card-meta">
          <span className="meta-chip">
            <Tv size={12} aria-hidden="true" />
            {progressLabel}
          </span>
          {anime.rating ? (
            <span className="meta-chip">
              <Star size={12} aria-hidden="true" />
              {anime.rating}/10
            </span>
          ) : null}
        </div>

        {(onUpdate && (showProgress || showCompletedBadge || showStartWatching)) ? (
          <div className="card-action">
            {showCompletedBadge ? (
              <div className="completed-status" aria-label="Completed">
                <CheckCircle size={14} aria-hidden="true" />
                Completed
              </div>
            ) : null}

            {showProgress ? (
              <div className="card-progress">
                {isAtMaxEpisodes ? (
                  <button
                    type="button"
                    className="complete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      openConfirm('complete');
                    }}
                  >
                    Mark as Completed
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="progress-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleProgressChange(-1);
                      }}
                      aria-label="decrease progress"
                    >
                      -
                    </button>
                    <span className="progress-text">Progress</span>
                    <button
                      type="button"
                      className="progress-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleProgressChange(1);
                      }}
                      aria-label="increase progress"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {showStartWatching ? (
              <button
                type="button"
                className="start-watch-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  openConfirm('start');
                }}
              >
                Start Watching
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {onRemove ? (
        <button
          type="button"
          className="card-remove"
          onClick={(event) => {
            event.stopPropagation();
            openConfirm('remove');
          }}
          aria-label="remove from list"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      ) : null}

      {confirmAction ? createPortal(
        <div
          className="confirm-overlay"
          onClick={(event) => {
            event.stopPropagation();
            closeConfirm();
          }}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h4>{confirmAction.title}</h4>
            <p>{confirmAction.message}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={(event) => {
                  event.stopPropagation();
                  closeConfirm();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`confirm-confirm ${confirmAction.variant}`}
                onClick={(event) => {
                  event.stopPropagation();
                  handleConfirm();
                }}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </article>
  );
}

export default UserAnimeCard;
