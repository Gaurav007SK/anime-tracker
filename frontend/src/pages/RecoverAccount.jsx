import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ShieldQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

function RecoverAccount() {
  const { fetchRecoveryQuestion, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [question, setQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    try {
      setLoadingQuestion(true);
      const data = await fetchRecoveryQuestion(username);
      setQuestion(data?.recoveryQuestion || '');
      if (!data?.recoveryQuestion) {
        setError('No recovery question found for this account.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not fetch recovery question.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!question) {
      setError('Please fetch your recovery question first.');
      return;
    }

    if (!recoveryAnswer.trim() || !newPassword || !confirmNewPassword) {
      setError('All fields are required to reset the password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword({ username, recoveryAnswer, newPassword });
      setMessage('Password reset successful. Redirecting to login...');

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password reset successful. Please sign in.' }
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">
          <KeyRound size={18} aria-hidden="true" />
          Recover Account
        </h1>
        <p className="auth-subtitle">Use your recovery question to set a new password.</p>

        {message && <div className="auth-message info">{message}</div>}
        {error && <div className="auth-message error">{error}</div>}

        <form className="auth-form" onSubmit={handleFetchQuestion}>
          <label htmlFor="recover-username">Username</label>
          <input
            id="recover-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
          <button className="auth-secondary-btn" type="submit" disabled={loadingQuestion}>
            {loadingQuestion ? 'Loading question...' : 'Get Recovery Question'}
          </button>
        </form>

        {question && (
          <form className="auth-form auth-reset-form" onSubmit={handleResetPassword}>
            <p className="recovery-question">
              <ShieldQuestion size={16} aria-hidden="true" />
              {question}
            </p>

            <label htmlFor="recover-answer">Recovery Answer</label>
            <input
              id="recover-answer"
              type="text"
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              placeholder="Enter your recovery answer"
            />

            <label htmlFor="recover-new-password">New Password</label>
            <input
              id="recover-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />

            <label htmlFor="recover-confirm-password">Confirm New Password</label>
            <input
              id="recover-confirm-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Re-enter your new password"
            />

            <button className="auth-submit-btn" type="submit" disabled={submitting}>
              {submitting ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
          <Link to="/signup">Need a new account? Sign up</Link>
        </div>
      </div>
    </section>
  );
}

export default RecoverAccount;