const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
const normalizeRecoveryAnswer = (value) => String(value || '').trim().toLowerCase();

const buildPublicUser = (user) => {
  if (!user) {
    return null;
  }

  const userId = user._id || user.id;
  const followersCount = typeof user.followersCount === 'number'
    ? user.followersCount
    : (Array.isArray(user.followers) ? user.followers.length : 0);
  const followingCount = typeof user.followingCount === 'number'
    ? user.followingCount
    : (Array.isArray(user.following) ? user.following.length : 0);

  return {
    id: userId ? userId.toString() : undefined,
    username: user.username,
    displayName: user.displayName || user.username,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    lastOnline: user.lastOnline || user.updatedAt || user.createdAt,
    followersCount,
    followingCount
  };
};

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const validateUsername = (username) => {
  if (!username || username.length < 3 || username.length > 30) {
    return 'Username must be between 3 and 30 characters';
  }

  if (!USERNAME_REGEX.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }

  return null;
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  return null;
};

const authController = {
  async signup(req, res) {
    try {
      const {
        username,
        password,
        recoveryQuestion,
        recoveryAnswer
      } = req.body;

      const normalizedUsername = normalizeUsername(username);
      const usernameError = validateUsername(normalizedUsername);
      if (usernameError) {
        return res.status(400).json({ success: false, error: usernameError });
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, error: passwordError });
      }

      if (!recoveryQuestion || !String(recoveryQuestion).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Recovery question is required'
        });
      }

      const normalizedRecoveryAnswer = normalizeRecoveryAnswer(recoveryAnswer);
      if (!normalizedRecoveryAnswer) {
        return res.status(400).json({
          success: false,
          error: 'Recovery answer is required'
        });
      }

      const existingUser = await User.findOne({ username: normalizedUsername });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists'
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const recoveryAnswerHash = await bcrypt.hash(normalizedRecoveryAnswer, SALT_ROUNDS);

      const user = await User.create({
        username: normalizedUsername,
        passwordHash,
        displayName: normalizedUsername,
        bio: '',
        avatarUrl: '',
        lastOnline: new Date(),
        recoveryQuestion: String(recoveryQuestion).trim(),
        recoveryAnswerHash
      });

      const token = createToken(user);

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: buildPublicUser(user)
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const normalizedUsername = normalizeUsername(username);

      if (!normalizedUsername || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      const user = await User.findOne({ username: normalizedUsername });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = createToken(user);

      return res.json({
        success: true,
        data: {
          token,
          user: buildPublicUser(user)
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getRecoveryQuestion(req, res) {
    try {
      const normalizedUsername = normalizeUsername(req.body.username);
      if (!normalizedUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }

      const user = await User.findOne({ username: normalizedUsername }).select('username recoveryQuestion');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.json({
        success: true,
        data: {
          username: user.username,
          recoveryQuestion: user.recoveryQuestion
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { username, recoveryAnswer, newPassword } = req.body;
      const normalizedUsername = normalizeUsername(username);
      const normalizedRecoveryAnswer = normalizeRecoveryAnswer(recoveryAnswer);

      if (!normalizedUsername || !normalizedRecoveryAnswer || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Username, recovery answer, and new password are required'
        });
      }

      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ success: false, error: passwordError });
      }

      const user = await User.findOne({ username: normalizedUsername });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const isRecoveryAnswerValid = await bcrypt.compare(
        normalizedRecoveryAnswer,
        user.recoveryAnswerHash
      );

      if (!isRecoveryAnswerValid) {
        return res.status(401).json({
          success: false,
          error: 'Recovery answer is incorrect'
        });
      }

      user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.save();

      return res.json({
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async me(req, res) {
    return res.json({
      success: true,
      data: {
        user: buildPublicUser(req.user)
      }
    });
  }
};

module.exports = authController;