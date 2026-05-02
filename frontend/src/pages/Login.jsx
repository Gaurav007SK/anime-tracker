import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

function Login() {
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectPath = location.state?.from || '/';
  const infoMessage = location.state?.message || '';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ username, password });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          <LogIn size={18} aria-hidden="true" />
          Login
        </h1>
        <p className="auth-subtitle">Sign in with your username and password.</p>

        {infoMessage && <div className="auth-message info">{infoMessage}</div>}
        {error && <div className="auth-message error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          <button className="auth-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/signup">Need an account? Sign up</Link>
          <Link to="/recover">
            <ShieldQuestion size={14} aria-hidden="true" />
            Forgot password?
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Login;