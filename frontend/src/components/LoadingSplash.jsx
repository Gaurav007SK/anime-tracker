import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music, Sparkles, DoorOpen } from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import '../styles/LoadingSplash.css';

const SONGS = [
  {
    src: '/Nyanpasu  Yabure kabure  AMV Lyrics.mp3',
    title: 'Nyanpasu - AMV'
  },
  {
    src: '/好きだから。 『ユイカ』【MV】.mp3',
    title: 'Suki Dakara - Yuika'
  },
  {
    src: '/YOASOBI「たぶん」Official Music  Video.mp3',
    title: 'Tabun - YOASOBI'
  }
].map((song) => ({ ...song, src: encodeURI(song.src) }));

export default function LoadingSplash({ onContinue }) {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [nextAttemptIn, setNextAttemptIn] = useState(3);
  const pollIntervalRef = useRef(3000);

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
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    if (playing) {
      const p = a.play();
      if (p && p.catch) p.catch(() => setPlaying(false));
    }
  }, [playing, index]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const togglePlay = () => setPlaying((p) => !p);
  const next = () => setIndex((i) => (i + 1) % SONGS.length);
  const prev = () => setIndex((i) => (i - 1 + SONGS.length) % SONGS.length);
  const currentSong = SONGS[index];

  const handleContinue = () => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setPlaying(false);
    onContinue();
  };

  return (
    <div className="loading-splash" role="dialog" aria-modal="true">
      <div className="loading-splash-inner">
        <div className="loading-visual">
          <div className={`logo-spin${playing ? ' spinning' : ''}`}>
            <Music size={20} />
            <span>OTAKU</span>
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

          <audio ref={audioRef} src={currentSong.src} loop onEnded={() => setPlaying(false)} />
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
