import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Music, Clapperboard, Moon, Sun } from 'lucide-react';
import '../styles/LoadingScreen.css';

const SONGS = [
  { name: 'Nyanpasu Yabure Kabure', file: 'Nyanpasu  Yabure kabure  AMV Lyrics.mp3' },
  { name: 'YOASOBI - Tabun', file: 'YOASOBI「たぶん」Official Music  Video.mp3' },
  { name: 'Sukidakara', file: '好きだから。 『ユイカ』【MV】.mp3' }
];

const MESSAGES = {
  en: {
    title: 'Server is waking up',
    subtitle: 'This can take around 50-60 seconds.',
    details: 'Enjoy a track while we reconnect.'
  },
  ja: {
    title: 'サーバーを起動しています',
    subtitle: '50〜60秒ほどかかる場合があります。',
    details: '接続中、音楽をお楽しみください。'
  }
};

function LoadingScreen() {
  const [theme, setTheme] = useState('dark');
  const [currentSong, setCurrentSong] = useState(() => SONGS[Math.floor(Math.random() * SONGS.length)]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [elapsed, setElapsed] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef(null);

  const tryPlay = useCallback(async ({ forceMuted = false } = {}) => {
    if (!audioRef.current) {
      return false;
    }

    const audio = audioRef.current;

    if (forceMuted) {
      audio.muted = true;
      setIsMuted(true);
    } else {
      audio.muted = isMuted;
    }

    try {
      await audio.play();
      setAutoplayBlocked(false);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, [isMuted]);

  useEffect(() => {
    const startPlayback = async () => {
      if (!currentSong || !audioRef.current) {
        return;
      }

      audioRef.current.currentTime = 0;
      const playedWithSound = await tryPlay();

      if (playedWithSound) {
        return;
      }

      // Fallback: browsers typically allow muted autoplay.
      const playedMuted = await tryPlay({ forceMuted: true });
      setAutoplayBlocked(!playedMuted);
    };

    startPlayback();
  }, [currentSong, tryPlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (!autoplayBlocked) {
      return undefined;
    }

    const handleFirstInteraction = async () => {
      const played = await tryPlay();
      if (played) {
        setAutoplayBlocked(false);
      }
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [autoplayBlocked, tryPlay]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => (prev < 60 ? prev + 1 : 60));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = async () => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      return;
    }

    await tryPlay();
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSongEnded = () => {
    const currentIndex = SONGS.findIndex((song) => song.file === currentSong.file);
    const nextIndex = (currentIndex + 1) % SONGS.length;
    setCurrentSong(SONGS[nextIndex]);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`loading-screen theme-${theme}`}>
      <div className="loading-app-brand loading-app-brand-outside" aria-label="Anime Tracker logo">
        <span className="loading-app-badge" aria-hidden="true">
          <Clapperboard size={16} />
        </span>
        <div className="loading-app-text">
          <p className="loading-app-kicker">Otaku Control Room</p>
          <p className="loading-app-title">Anime Tracker</p>
        </div>
      </div>

      <div className="loading-container">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-pressed={theme === 'dark'}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </span>
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb"></span>
          </span>
        </button>

        <div className="loading-header">
          <div className="loading-logo-wrapper">
            <Music className="loading-music-icon" size={24} />
          </div>
          <div className="loading-headline">
            <h1 className="loading-title">{MESSAGES.en.title}</h1>
            <p className="loading-title-ja">{MESSAGES.ja.title}</p>
          </div>
          <p className="loading-pill">Estimate time: 50-60s</p>
        </div>

        <div className="loading-content">
          <div className="loading-row" aria-label="English loading message">
            <span className="loading-row-label">EN</span>
            <div>
              <p className="loading-subtitle">{MESSAGES.en.subtitle}</p>
              <p className="loading-details">{MESSAGES.en.details}</p>
            </div>
          </div>
          <div className="loading-row" aria-label="Japanese loading message">
            <span className="loading-row-label">JP</span>
            <div>
              <p className="loading-subtitle">{MESSAGES.ja.subtitle}</p>
              <p className="loading-details">{MESSAGES.ja.details}</p>
            </div>
          </div>
        </div>

        {currentSong && (
          <div className="loading-player">
            <div className="player-info">
              <div className="player-details">
                <p className="player-label">Now Playing</p>
                <p className="player-song-name">{currentSong.name}</p>
              </div>
              <span className="time-display">{formatTime(elapsed)}</span>
            </div>

            <div className="player-controls">
              <button
                className="player-btn"
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="player-volume-control">
                <button
                  className="player-btn volume-btn"
                  onClick={handleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                  disabled={isMuted}
                  aria-label="Volume"
                />
              </div>
            </div>

            <audio
              ref={audioRef}
              src={`/${currentSong.file}`}
              onEnded={handleSongEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              preload="auto"
              playsInline
              loop={false}
            ></audio>
          </div>
        )}

        <div className="loading-footer">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          <p className="loading-status">
            {autoplayBlocked ? 'Tap anywhere to start music...' : 'Waking up server...'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
