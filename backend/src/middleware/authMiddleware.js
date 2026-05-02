const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token is required'
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Server auth configuration is missing'
      });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('_id username');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = authenticate;