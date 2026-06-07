const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const optionalAuthenticate = require('../middleware/optionalAuthMiddleware');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/me', authenticate, profileController.getMyProfile);
router.put('/me', authenticate, profileController.updateMyProfile);
router.post('/:username/follow', authenticate, profileController.followUser);
router.delete('/:username/follow', authenticate, profileController.unfollowUser);
router.get('/:username', optionalAuthenticate, profileController.getProfileByUsername);

module.exports = router;