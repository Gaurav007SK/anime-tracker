import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Clock3,
  UserCheck,
  UserRound,
  Users
} from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import { useAuth } from '../context/AuthContext';
import FetchErrorState from '../components/FetchErrorState';
import '../styles/Profile.css';

const formatLastOnline = (value) => {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 2) {
    return 'Online just now';
  }

  if (diffMinutes < 60) {
    return `Active ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `Active ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return `Active ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const resolvedUsername = username || user?.username || '';
  const isOwnProfile = Boolean(user && resolvedUsername === user.username);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const profileTitle = useMemo(() => {
    if (!profile) {
      return 'Profile';
    }

    return `${profile.username} | Anime Tracker`;
  }, [profile]);

  useEffect(() => {
    document.title = profileTitle;
  }, [profileTitle]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!resolvedUsername) {
        if (!isAuthenticated) {
          navigate('/login', { replace: true, state: { message: 'Login to view your profile.' } });
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = isOwnProfile
          ? await animeAPI.getMyProfile()
          : await animeAPI.getUserProfile(resolvedUsername);

        const nextProfile = response.data?.data?.profile;
        if (!nextProfile) {
          throw new Error('Profile data is missing');
        }

        setProfile(nextProfile);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          navigate('/login', {
            replace: true,
            state: { message: 'Session expired. Please login again.' }
          });
          return;
        }

        setError(err.response?.data?.error || 'Error fetching profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [resolvedUsername, isOwnProfile, isAuthenticated, navigate, logout, reloadKey]);

  const toggleFollow = async () => {
    if (!profile || isOwnProfile) {
      return;
    }

    try {
      setFollowLoading(true);
      const response = profile.isFollowing
        ? await animeAPI.unfollowUser(profile.username)
        : await animeAPI.followUser(profile.username);

      const updatedProfile = response.data?.data?.profile;
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const profileInitial = (profile?.displayName || profile?.username || '?').slice(0, 1).toUpperCase();
  const avatarSource = profile?.avatarUrl || '';

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (error && !profile) {
    return (
      <section className="profile-page">
        <FetchErrorState message={error} onRetry={() => setReloadKey((current) => current + 1)} />
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar-shell">
          {avatarSource ? (
            <img src={avatarSource} alt={`${profile.displayName || profile.username} avatar`} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">
              {profileInitial}
            </div>
          )}
        </div>

        <div className="profile-meta">
          <p className="profile-eyebrow">
            <UserRound size={14} aria-hidden="true" />
            Social Profile
          </p>
          <h1 className="profile-name">{profile.displayName || profile.username}</h1>
          <p className="profile-handle">@{profile.username}</p>
          <p className="profile-bio">{profile.bio || 'No bio yet. This user is still building their anime runway.'}</p>

          <div className="profile-meta-row">
            <div className="profile-meta-chip">
              <Clock3 size={14} aria-hidden="true" />
              <span>{formatLastOnline(profile.lastOnline)}</span>
            </div>
            <div className="profile-meta-chip">
              <Users size={14} aria-hidden="true" />
              <span>{profile.followersCount} followers</span>
            </div>
            <div className="profile-meta-chip">
              <Users size={14} aria-hidden="true" />
              <span>{profile.followingCount} following</span>
            </div>
          </div>

          <div className="profile-actions-row">
            {!isOwnProfile && (
              <button type="button" className="profile-follow-btn" onClick={toggleFollow} disabled={followLoading}>
                {followLoading ? (
                  <UserCheck size={15} className="spin" aria-hidden="true" />
                ) : profile.isFollowing ? (
                  <UserCheck size={15} aria-hidden="true" />
                ) : (
                  <UserRound size={15} aria-hidden="true" />
                )}
                <span>{profile.isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            )}

            {isOwnProfile && (
              <Link to="/profile/edit" className="profile-edit-cta">
                <span>Edit Profile</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && profile && (
        <div className="profile-inline-error" role="alert">
          {error}
        </div>
      )}

      <div className="profile-grid">
        <div className="profile-panel profile-stats-panel">
          <div className="profile-panel-header">
            <h2>Profile Stats</h2>
          </div>
          <div className="profile-stats-grid">
            <article className="profile-stat-card">
              <span className="profile-stat-label">Followers</span>
              <strong>{profile.followersCount}</strong>
            </article>
            <article className="profile-stat-card">
              <span className="profile-stat-label">Following</span>
              <strong>{profile.followingCount}</strong>
            </article>
            <article className="profile-stat-card">
              <span className="profile-stat-label">Last online</span>
              <strong>{formatLastOnline(profile.lastOnline)}</strong>
            </article>
            <article className="profile-stat-card">
              <span className="profile-stat-label">Status</span>
              <strong>{profile.isOwnProfile ? 'This is you' : profile.isFollowing ? 'Mutual interest' : 'Public profile'}</strong>
            </article>
          </div>
        </div>

        <div className="profile-panel profile-about-panel">
          <div className="profile-panel-header">
            <h2>About</h2>
          </div>
          <p>
            {profile.displayName || profile.username} tracks anime, builds lists, and now has a public profile.
          </p>
          <Link className="profile-return-link" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Profile;