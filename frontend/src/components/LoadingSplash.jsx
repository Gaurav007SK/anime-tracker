import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Sparkles, DoorOpen } from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import '../styles/LoadingSplash.css';

const SONGS = [
  {
    videoId: 'lnKjKEEoheM',
    title: 'Nyanpasu Yabure Kabure with Lyrics'
  },
  {
    videoId: '8iuLXODzL04',
    title: 'YOASOBI「たぶん」Official Music Video'
  },
  {
    videoId: 'Az5XPYw16Eg',
    title: 'Suki Dakara/好きだから'
  }
];

const loadYouTubeIframeAPI = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__animeTrackerYouTubeApiPromise) {
    return window.__animeTrackerYouTubeApiPromise;
  }

  window.__animeTrackerYouTubeApiPromise = new Promise((resolve) => {
    const previousHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousHandler === 'function') {
        previousHandler();
      }
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return window.__animeTrackerYouTubeApiPromise;
};

export default function LoadingSplash({ onContinue }) {
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [serverReady, setServerReady] = useState(false);
  const [nextAttemptIn, setNextAttemptIn] = useState(3);
  const [playerReady, setPlayerReady] = useState(false);
  const pollIntervalRef = useRef(3000);
  const indexRef = useRef(index);
  const playingRef = useRef(playing);

  useEffect(() => {
    indexRef.current = index;
    playingRef.current = playing;
  }, [index, playing]);

  useEffect(() => {
    let mounted = true;
    let countdownTimer = null;
    const startCountdown = (secs) => {
      setNextAttemptIn(secs);
      clearInterval(countdownTimer);
      countdownTimer = setInterval(() => {
        setNextAttemptIn((s) => {
          if (s <= 1) {
            clearInterval(countdownTimer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    };

    const tryPing = async () => {
      startCountdown(Math.round(pollIntervalRef.current / 1000));
      try {
        await animeAPI.ping();
        if (mounted) setServerReady(true);
      } catch {
        // backoff up to 10s
        pollIntervalRef.current = Math.min(10000, pollIntervalRef.current * 1.5);
        setTimeout(tryPing, pollIntervalRef.current);
      }
    };

    // initial attempt after small delay to let app finish boot
    const t = setTimeout(tryPing, 800);
    return () => {
      mounted = false;
      clearTimeout(t);
      clearInterval(countdownTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializePlayer = async () => {
      await loadYouTubeIframeAPI();

      if (!isMounted || !playerContainerRef.current || playerRef.current) {
        return;
      }

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: SONGS[indexRef.current].videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          enablejsapi: 1
        },
        events: {
          onReady: () => {
            if (!isMounted) return;
            setPlayerReady(true);
            if (playingRef.current) {
              playerRef.current?.playVideo();
            }
          }
        }
      });
    };

    initializePlayer();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!playerReady || !playerRef.current) {
      return;
    }

    const player = playerRef.current;
    player.loadVideoById(SONGS[indexRef.current].videoId);
    if (playingRef.current) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  }, [index, playerReady]);

  useEffect(() => {
    if (!playerReady || !playerRef.current) {
      return;
    }

    if (playing) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [playing, playerReady]);

  useEffect(() => () => {
    if (!playerRef.current) return;
    playerRef.current.stopVideo();
    playerRef.current.destroy();
    playerRef.current = null;
  }, []);

  const togglePlay = () => setPlaying((p) => !p);
  const syncPlayerToIndex = (nextIndex, shouldAutoPlay = playingRef.current) => {
    setIndex(nextIndex);

    if (!playerReady || !playerRef.current) {
      return;
    }

    playerRef.current.loadVideoById(SONGS[nextIndex].videoId);

    if (shouldAutoPlay) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  };

  const next = () => syncPlayerToIndex((indexRef.current + 1) % SONGS.length);
  const prev = () => syncPlayerToIndex((indexRef.current - 1 + SONGS.length) % SONGS.length);
  const currentSong = SONGS[index];

  const handleContinue = () => {
    if (playerRef.current) {
      playerRef.current.stopVideo();
    }

    setPlaying(false);
    onContinue();
  };

  return (
    <div className="loading-splash" role="dialog" aria-modal="true">
      <div className="loading-splash-inner">
        <div className="loading-visual">
          <div className="youtube-player-shell">
            <div ref={playerContainerRef} className="youtube-player-frame" aria-label="YouTube music player" />
          </div>
          <div className="loading-dot-grid" />
        </div>

        <div className="loading-copy">
          <h2>{serverReady ? 'The server is awake' : 'Waking the backend…'}</h2>
          <p>
            {serverReady
              ? 'The gate is open. You can keep vibing or jump into the app whenever you\'re ready.'
              : 'Our backend is waking up from sleep. This can take a few seconds.'}
          </p>
          {!serverReady ? (
            <p className="attempt">Next health check in <strong>{nextAttemptIn}s</strong></p>
          ) : (
            <p className="attempt ready-attempt"><Sparkles size={14} /> The homeroom is ready for the next scene.</p>
          )}
        </div>

        <div className="music-player">
          <div className="song-info">
            <Music size={16} />
            <div className="song-meta">
              <div className="song-title">{currentSong.title}</div>
            </div>
          </div>

          <div className="player-controls">
            <button type="button" className="btn-icon" onClick={prev} aria-label="Previous">
              <SkipBack size={18} />
            </button>
            <button type="button" className="btn-icon play" onClick={togglePlay} aria-pressed={playing}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button type="button" className="btn-icon" onClick={next} aria-label="Next">
              <SkipForward size={18} />
            </button>
          </div>

        </div>

        <div className="loading-actions">
          <button
            type="button"
            className="continue-btn"
            onClick={handleContinue}
            disabled={!serverReady}
          >
            <DoorOpen size={16} />
            <span>{serverReady ? 'Find Something Peak' : 'Hold on, the gate is still opening'}</span>
          </button>
          <p className="continue-hint">
            {serverReady
              ? 'The music stays with you until you choose to move on.'
              : 'Stay here and enjoy the soundtrack while the server wakes up.'}
          </p>
        </div>
      </div>
    </div>
  );
}
