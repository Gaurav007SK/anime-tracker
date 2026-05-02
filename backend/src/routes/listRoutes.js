const express = require('express');
const listController = require('../controllers/listController');
const authenticate = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.post('/add', listController.addToList);
router.get('/', listController.getMyList);
router.put('/:id', listController.updateProgress);
router.delete('/:id', listController.removeFromList);

module.exports = router;
