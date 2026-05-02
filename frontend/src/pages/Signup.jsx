import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

function Signup() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    recoveryQuestion: '',
    recoveryAnswer: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (
      !formData.username.trim() ||
      !formData.password ||
      !formData.recoveryQuestion.trim() ||
      !formData.recoveryAnswer.trim()
    ) {
      setError('All fields are required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await signup({
        username: formData.username,
        password: formData.password,
        recoveryQuestion: formData.recoveryQuestion,
        recoveryAnswer: formData.recoveryAnswer
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Sign up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          <UserPlus size={18} aria-hidden="true" />
          Create Account
        </h1>
        <p className="auth-subtitle">
          Use username, password, and a recovery question for account access.
        </p>

        {error && <div className="auth-message error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Choose a username"
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Choose a password"
          />

          <label htmlFor="signup-confirm-password">Confirm Password</label>
          <input
            id="signup-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
          />

          <label htmlFor="signup-recovery-question">Recovery Question</label>
          <input
            id="signup-recovery-question"
            name="recoveryQuestion"
            type="text"
            value={formData.recoveryQuestion}
            onChange={handleChange}
            placeholder="Example: What was your first anime?"
          />

          <label htmlFor="signup-recovery-answer">Recovery Answer</label>
          <input
            id="signup-recovery-answer"
            name="recoveryAnswer"
            type="text"
            value={formData.recoveryAnswer}
            onChange={handleChange}
            placeholder="Enter your answer"
          />

          <button className="auth-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </section>
  );
}

export default Signup;