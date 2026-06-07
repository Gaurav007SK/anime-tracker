import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Clock3,
  LoaderCircle,
  Save,
  Sparkles,
  UserRound,
  Users
} from 'lucide-react';
import { animeAPI } from '../api/animeAPI';
import { useAuth } from '../context/AuthContext';
import FetchErrorState from '../components/FetchErrorState';
import '../styles/EditProfile.css';

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

function EditProfile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFileName, setAvatarFileName] = useState('');

  const pageTitle = useMemo(() => 'Edit Profile', []);



  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    document.title = pageTitle ;

    return () => {
      document.title = 'Otaku Control Room';
    };
  }, [pageTitle]);
  

  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true, state: { message: 'Login to edit your profile.' } });
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await animeAPI.getMyProfile();
        const nextProfile = response.data?.data?.profile;

        if (!nextProfile) {
          throw new Error('Profile data is missing');
        }

        setProfile(nextProfile);
        setDisplayName(nextProfile.displayName || '');
        setBio(nextProfile.bio || '');
        setAvatarPreview(nextProfile.avatarUrl || '');
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          navigate('/login', {
            replace: true,
            state: { message: 'Session expired. Please login again.' }
          });
          return;
        }

        setError(err.response?.data?.error || 'Error loading profile editor');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, navigate, logout, reloadKey]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setAvatarDataUrl(result);
      setAvatarPreview(result);
      setAvatarFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const response = await animeAPI.updateMyProfile({
        displayName,
        bio,
        ...(avatarDataUrl ? { avatarDataUrl } : {})
      });

      const updatedProfile = response.data?.data?.profile;
      if (!updatedProfile) {
        throw new Error('Updated profile missing from server response');
      }

      setProfile(updatedProfile);
      setAvatarDataUrl('');
      setAvatarPreview(updatedProfile.avatarUrl || '');
      setAvatarFileName('');
      updateUser(updatedProfile);

      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const avatarInitial = (displayName || user?.displayName || user?.username || '?').slice(0, 1).toUpperCase();
  const avatarSource = avatarPreview || profile?.avatarUrl || '';
  const bioCount = bio.length;

  if (loading) {
    return <div className="edit-profile-loading">Opening profile editor...</div>;
  }

  if (error && !profile) {
    return (
      <section className="edit-profile-page">
        <FetchErrorState message={error} onRetry={() => setReloadKey((current) => current + 1)} />
      </section>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <section className="edit-profile-page">
      <div className="edit-profile-hero">
        <div>
          <p className="edit-profile-kicker">
            <Sparkles size={14} aria-hidden="true" />
            Profile Studio
          </p>
          <h1>Edit your public identity</h1>
          <p className="edit-profile-subtitle">
            Update your display name, bio, and avatar. Your changes go live as soon as you save.
          </p>
        </div>

        <Link to="/profile" className="edit-profile-back-link">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to profile
        </Link>
      </div>

      {error && profile && (
        <div className="edit-profile-inline-error" role="alert">
          {error}
        </div>
      )}

      <div className="edit-profile-layout">
        <form className="edit-profile-form-panel" onSubmit={handleSubmit}>
          <div className="edit-profile-panel-heading">
            <h2>
              <UserRound size={18} aria-hidden="true" />
              Profile Details
            </h2>
            <p>These fields are visible to other users.</p>
          </div>

          <div className="edit-profile-field-grid">
            <div className="edit-profile-field">
              <label htmlFor="edit-display-name">Display name</label>
              <input
                id="edit-display-name"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your public display name"
              />
            </div>

            <div className="edit-profile-field">
              <label htmlFor="edit-username">Username</label>
              <input
                id="edit-username"
                type="text"
                value={profile.username}
                disabled
                aria-readonly="true"
              />
            </div>
          </div>

          <div className="edit-profile-field">
            <div className="edit-profile-field-header">
              <label htmlFor="edit-bio">Bio</label>
              <span>{bioCount}/280</span>
            </div>
            <textarea
              id="edit-bio"
              rows="6"
              maxLength="280"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell people what you are watching, what you like, or what makes your anime taste unique"
            />
          </div>

          <div className="edit-profile-upload-panel">
            <div className="edit-profile-panel-heading compact">
              <h2>
                <Camera size={18} aria-hidden="true" />
                Avatar
              </h2>
              <p>Upload an image and we store it in Cloudinary.</p>
            </div>

            <label className="edit-profile-upload-zone" htmlFor="edit-avatar-upload">
              <input id="edit-avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} />
              <div className="edit-profile-upload-badge">
                <Camera size={18} aria-hidden="true" />
              </div>
              <div>
                <strong>Choose a profile photo</strong>
                <p>{avatarFileName || 'PNG, JPG, or WEBP up to a reasonable size'}</p>
              </div>
              <span className="edit-profile-upload-action">Browse</span>
            </label>
          </div>

          <div className="edit-profile-actions">
            <Link to="/profile" className="edit-profile-secondary-btn">
              Cancel
            </Link>
            <button type="submit" className="edit-profile-save-btn" disabled={saving}>
              {saving ? (
                <LoaderCircle size={15} className="spin" aria-hidden="true" />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              <span>{saving ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </form>

        <aside className="edit-profile-preview-panel">
          <div className="edit-profile-preview-card">
            <div className="edit-profile-preview-header">
              <span>Live Preview</span>
              <div className="edit-profile-preview-status">
                <Clock3 size={13} aria-hidden="true" />
                <span>{formatLastOnline(profile.lastOnline)}</span>
              </div>
            </div>

            <div className="edit-profile-avatar-wrap">
              {avatarSource ? (
                <img src={avatarSource} alt={`${displayName || profile.username} avatar`} className="edit-profile-avatar" />
              ) : (
                <div className="edit-profile-avatar edit-profile-avatar-fallback" aria-hidden="true">
                  {avatarInitial}
                </div>
              )}
            </div>

            <h3>{displayName || profile.displayName || profile.username}</h3>
            <p className="edit-profile-handle">@{profile.username}</p>
            <p className="edit-profile-bio-preview">{bio || 'Your bio preview will appear here.'}</p>

            <div className="edit-profile-preview-stats">
              <div>
                <strong>{profile.followersCount}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{profile.followingCount}</strong>
                <span>Following</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default EditProfile;