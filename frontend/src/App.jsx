import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import {
  Clapperboard,
  House,
  LibraryBig,
  Sparkles,
  LogIn,
  UserPlus,
  LogOut,
  UserRound,
  Menu,
  X
} from 'lucide-react';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import GenreResults from './pages/GenreResults';
import MyList from './pages/MyList';
import AnimeDetail from './pages/AnimeDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import RecoverAccount from './pages/RecoverAccount';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import { useBackendHealth } from './hooks/useBackendHealth';
import './App.css';

function App() {
  const { user, logout, loading } = useAuth();

  return (
    <Router>
      <AppShell user={user} logout={logout} loading={loading} />
    </Router>
  );
}

function AppShell({ user, logout, loading }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isHealthy, isInitialized } = useBackendHealth();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Show loading screen if backend is not healthy and we've done at least one check
  if (!isHealthy && isInitialized) {
    return <LoadingScreen />;
  }

  const renderAuthActions = (variant = 'desktop') => {
    if (user) {
      return (
        <>
          <div className={`auth-user-pill auth-user-pill-${variant}`} title={`Signed in as ${user.username}`}>
            <UserRound size={14} />
            <span>{user.username}</span>
          </div>
          <button type="button" className={`logout-btn logout-btn-${variant}`} onClick={logout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </>
      );
    }

    if (loading) {
      return null;
    }

    return (
      <>
        <NavLink to="/login" className={({ isActive }) => `nav-link nav-link-${variant}${isActive ? ' active' : ''}`} onClick={closeMobileMenu}>
          <LogIn size={16} />
          <span>Login</span>
        </NavLink>
        <NavLink to="/signup" className={({ isActive }) => `nav-link nav-link-${variant}${isActive ? ' active' : ''}`} onClick={closeMobileMenu}>
          <UserPlus size={16} />
          <span>Sign Up</span>
        </NavLink>
      </>
    );
  };

  return (
    <div className="app">
      <div className="app-atmosphere" aria-hidden="true">
        <span className="atmosphere-orb orb-one"></span>
        <span className="atmosphere-orb orb-two"></span>
        <span className="atmosphere-grid"></span>
      </div>

      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <span className="logo-badge" aria-hidden="true">
              <Clapperboard size={18} />
            </span>
            <span className="logo-text-wrap">
              <span className="logo-kicker">Otaku Control Room</span>
              <span className="logo-title">Anime Tracker</span>
            </span>
          </Link>

          <button
            type="button"
            className={`mobile-menu-toggle${mobileMenuOpen ? ' open' : ''}`}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="nav-links desktop-nav">
            <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
              <House size={16} />
              Home
            </NavLink>
            <NavLink to="/my-list" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <LibraryBig size={16} />
              My List
            </NavLink>

            {renderAuthActions('desktop')}
          </div>
        </div>

        <div className={`mobile-nav-panel${mobileMenuOpen ? ' open' : ''}`}>
          <div className="mobile-nav-panel-inner">
            <NavLink to="/" className={({ isActive }) => `nav-link nav-link-mobile${isActive ? ' active' : ''}`} end onClick={closeMobileMenu}>
              <House size={16} />
              Home
            </NavLink>
            <NavLink to="/my-list" className={({ isActive }) => `nav-link nav-link-mobile${isActive ? ' active' : ''}`} onClick={closeMobileMenu}>
              <LibraryBig size={16} />
              My List
            </NavLink>

            {user ? (
              <>
                <div className="auth-user-pill auth-user-pill-mobile" title={`Signed in as ${user.username}`}>
                  <UserRound size={14} />
                  <span>{user.username}</span>
                </div>
                <button type="button" className="logout-btn logout-btn-mobile" onClick={() => { logout(); closeMobileMenu(); }}>
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              !loading && (
                <>
                  <NavLink to="/login" className={({ isActive }) => `nav-link nav-link-mobile${isActive ? ' active' : ''}`} onClick={closeMobileMenu}>
                    <LogIn size={16} />
                    Login
                  </NavLink>
                  <NavLink to="/signup" className={({ isActive }) => `nav-link nav-link-mobile${isActive ? ' active' : ''}`} onClick={closeMobileMenu}>
                    <UserPlus size={16} />
                    Sign Up
                  </NavLink>
                </>
              )
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/genre/:genreKey" element={<GenreResults />} />
          <Route
            path="/my-list"
            element={(
              <ProtectedRoute>
                <MyList />
              </ProtectedRoute>
            )}
          />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/recover" element={<RecoverAccount />} />
        </Routes>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Primary mobile actions">
        <NavLink to="/" className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`} end>
          <House size={18} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/my-list" className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
          <LibraryBig size={18} />
          <span>List</span>
        </NavLink>
        {!loading && (
          user ? (
            <button type="button" className="bottom-nav-link bottom-nav-button" onClick={logout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
              <LogIn size={18} />
              <span>Login</span>
            </NavLink>
          )
        )}
      </nav>

      <footer className="footer">
        <p>
          <Sparkles size={15} aria-hidden="true" />
          Powered by Jikan API and crafted for anime marathons
        </p>
      </footer>
    </div>
  );
}

export default App;