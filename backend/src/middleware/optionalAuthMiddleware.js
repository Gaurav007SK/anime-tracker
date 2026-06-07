const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    if (!process.env.JWT_SECRET) {
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      '_id username displayName bio avatarUrl lastOnline followers following'
    );

    if (!user) {
      return next();
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      lastOnline: user.lastOnline,
      followersCount: Array.isArray(user.followers) ? user.followers.length : 0,
      followingCount: Array.isArray(user.following) ? user.following.length : 0
    };

    return next();
  } catch (error) {
    return next();
  }
};

module.exports = optionalAuthenticate;