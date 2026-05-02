import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Crown,
  Sword,
  Heart,
  Stars,
  Compass,
  Sun
} from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import HeroCarousel from '../components/HeroCarousel';
import LazyLoadSection from '../components/LazyLoadSection';
import '../styles/Home.css';

function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingData, setTrendingData] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch trending anime on mount
  useEffect(() => {
    fetchTrendingAnime();
  }, []);

  const fetchTrendingAnime = async () => {
    try {
      setTrendingLoading(true);
      const res = await animeAPI.getTrendingAnime(1);
      setTrendingData(res.data?.data?.slice(0, 20) || []);
    } catch (error) {
      console.error('[Home Error]', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Lazy loading functions for different genres
  const fetchTopAnime = async () => {
    const res = await animeAPI.getTopAnime(1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const fetchActionAnime = async () => {
    const res = await animeAPI.getAnimeByGenre('action', 1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const fetchDramaAnime = async () => {
    const res = await animeAPI.getAnimeByGenre('drama', 1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const fetchFantasyAnime = async () => {
    const res = await animeAPI.getAnimeByGenre('fantasy', 1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const fetchAdventureAnime = async () => {
    const res = await animeAPI.getAnimeByGenre('adventure', 1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const fetchSliceOfLifeAnime = async () => {
    const res = await animeAPI.getAnimeByGenre('slice_of_life', 1);
    return res.data?.data?.slice(0, 20) || [];
  };

  const sections = [
    {
      key: 'top-rated',
      title: 'Top Rated',
      subtitle: 'Classics and modern legends ranked by score',
      icon: Crown,
      fetchData: fetchTopAnime,
      seeMorePath: '/genre/top-rated'
    },
    {
      key: 'action',
      title: 'Action Packed',
      subtitle: 'High-energy battles and adrenaline-heavy arcs',
      icon: Sword,
      fetchData: fetchActionAnime,
      seeMorePath: '/genre/action'
    },
    {
      key: 'drama',
      title: 'Emotional Dramas',
      subtitle: 'Character-driven stories with memorable depth',
      icon: Heart,
      fetchData: fetchDramaAnime,
      seeMorePath: '/genre/drama'
    },
    {
      key: 'fantasy',
      title: 'Fantasy Worlds',
      subtitle: 'Magic systems, mythical realms, and epic quests',
      icon: Stars,
      fetchData: fetchFantasyAnime,
      seeMorePath: '/genre/fantasy'
    },
    {
      key: 'adventure',
      title: 'Adventures',
      subtitle: 'Road-trip energy across wild and unknown worlds',
      icon: Compass,
      fetchData: fetchAdventureAnime,
      seeMorePath: '/genre/adventure'
    },
    {
      key: 'slice-of-life',
      title: 'Slice of Life',
      subtitle: 'Warm, grounded stories for slower nights',
      icon: Sun,
      fetchData: fetchSliceOfLifeAnime,
      seeMorePath: '/genre/slice-of-life'
    }
  ];

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="hero-pill">
            <Sparkles size={14} aria-hidden="true" />
            Live discoveries from the anime multiverse
          </p>
          <h1>Find Your Next Anime Obsession</h1>
          <p>
            Browse trending picks, explore genre lanes, and build a watchlist that actually feels curated.
          </p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <label className="search-input-wrap" htmlFor="anime-search-input">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              id="anime-search-input"
              type="text"
              placeholder="Search anime by title, mood, or genre"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </label>
          <button type="submit" className="search-btn">
            <Search size={16} aria-hidden="true" />
            Search
          </button>
        </form>
      </section>

      <section className="carousel-wrapper-main">
        <HeroCarousel animeList={trendingData} isLoading={trendingLoading} />
      </section>

      {sections.map((section) => (
        <section className="carousel-wrapper-main" key={section.key}>
          <LazyLoadSection
            title={section.title}
            subtitle={section.subtitle}
            icon={section.icon}
            fetchData={section.fetchData}
            seeMorePath={section.seeMorePath}
          />
        </section>
      ))}
    </div>
  );
}

export default Home;
