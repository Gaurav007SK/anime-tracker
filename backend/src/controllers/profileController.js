const cloudinary = require('../config/cloudinary');
const User = require('../models/User');

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const formatProfile = (user, viewerId = null) => {
  if (!user) {
    return null;
  }

  const followerIds = Array.isArray(user.followers) ? user.followers : [];
  const followingIds = Array.isArray(user.following) ? user.following : [];
  const viewerKey = viewerId ? viewerId.toString() : null;
  const isOwnProfile = viewerKey ? viewerKey === user._id.toString() : false;
  const isFollowing = viewerKey
    ? followerIds.some((followerId) => followerId?.toString?.() === viewerKey)
    : false;

  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || user.username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    lastOnline: user.lastOnline || user.updatedAt || user.createdAt,
    followersCount: followerIds.length,
    followingCount: followingIds.length,
    isOwnProfile,
    isFollowing
  };
};

const validateProfilePayload = ({ displayName, bio }) => {
  const nextDisplayName = String(displayName || '').trim();
  const nextBio = String(bio || '').trim();

  if (nextDisplayName && (nextDisplayName.length < 2 || nextDisplayName.length > 60)) {
    return 'Display name must be between 2 and 60 characters';
  }

  if (nextBio.length > 280) {
    return 'Bio must be 280 characters or less';
  }

  return null;
};

const uploadAvatar = async (avatarDataUrl, userId) => {
  if (!avatarDataUrl) {
    return null;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured');
  }

  const uploadResult = await cloudinary.uploader.upload(avatarDataUrl, {
    folder: 'anime-tracker/avatars',
    public_id: `user-${userId}`,
    overwrite: true,
    resource_type: 'image'
  });

  return uploadResult.secure_url;
};

const profileController = {
  async getProfileByUsername(req, res) {
    try {
      const normalizedUsername = normalizeUsername(req.params.username);
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, error: 'Username is required' });
      }

      const user = await User.findOne({ username: normalizedUsername }).select(
        '_id username displayName bio avatarUrl lastOnline followers following createdAt updatedAt'
      );

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({
        success: true,
        data: {
          profile: formatProfile(user, req.user?.id || null)
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMyProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select(
        '_id username displayName bio avatarUrl lastOnline followers following createdAt updatedAt'
      );

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({
        success: true,
        data: {
          profile: formatProfile(user, req.user.id)
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async updateMyProfile(req, res) {
    try {
      const { displayName, bio, avatarDataUrl } = req.body;
      const profileError = validateProfilePayload({ displayName, bio });
      if (profileError) {
        return res.status(400).json({ success: false, error: profileError });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (typeof displayName === 'string') {
        const trimmedDisplayName = displayName.trim();
        user.displayName = trimmedDisplayName || user.username;
      }

      if (typeof bio === 'string') {
        user.bio = bio.trim();
      }

      if (avatarDataUrl) {
        user.avatarUrl = await uploadAvatar(avatarDataUrl, user._id.toString());
      }

      user.lastOnline = new Date();
      await user.save();

      return res.json({
        success: true,
        data: {
          profile: formatProfile(user, user._id.toString())
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async followUser(req, res) {
    try {
      const normalizedUsername = normalizeUsername(req.params.username);
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, error: 'Username is required' });
      }

      const currentUser = await User.findById(req.user.id);
      const targetUser = await User.findOne({ username: normalizedUsername });

      if (!currentUser || !targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (currentUser._id.toString() === targetUser._id.toString()) {
        return res.status(400).json({ success: false, error: 'You cannot follow yourself' });
      }

      await Promise.all([
        User.updateOne(
          { _id: currentUser._id },
          { $addToSet: { following: targetUser._id } }
        ),
        User.updateOne(
          { _id: targetUser._id },
          { $addToSet: { followers: currentUser._id } }
        )
      ]);

      const refreshedProfile = await User.findById(targetUser._id).select(
        '_id username displayName bio avatarUrl lastOnline followers following createdAt updatedAt'
      );

      return res.json({
        success: true,
        data: {
          profile: formatProfile(refreshedProfile, currentUser._id.toString())
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async unfollowUser(req, res) {
    try {
      const normalizedUsername = normalizeUsername(req.params.username);
      if (!normalizedUsername) {
        return res.status(400).json({ success: false, error: 'Username is required' });
      }

      const currentUser = await User.findById(req.user.id);
      const targetUser = await User.findOne({ username: normalizedUsername });

      if (!currentUser || !targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      await Promise.all([
        User.updateOne(
          { _id: currentUser._id },
          { $pull: { following: targetUser._id } }
        ),
        User.updateOne(
          { _id: targetUser._id },
          { $pull: { followers: currentUser._id } }
        )
      ]);

      const refreshedProfile = await User.findById(targetUser._id).select(
        '_id username displayName bio avatarUrl lastOnline followers following createdAt updatedAt'
      );

      return res.json({
        success: true,
        data: {
          profile: formatProfile(refreshedProfile, currentUser._id.toString())
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = profileController;