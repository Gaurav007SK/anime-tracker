const express = require('express');
const animeController = require('../controllers/animeController');

const router = express.Router();

// Search anime
router.get('/search', animeController.searchAnime);

// Get search filters (genres/themes)
router.get('/search/filters', animeController.getSearchFilters);

// Get trending anime
router.get('/trending', animeController.getTrendingAnime);

// Get top-rated anime
router.get('/top', animeController.getTopAnime);

// Get anime by genre
router.get('/genre', animeController.getAnimeByGenre);

// Get all available genres
router.get('/genres', animeController.getAllGenres);

// Get anime details (must be after other routes to avoid conflicts)
router.get('/details/:id', animeController.getAnimeDetails);

// Get related seasons or similar anime
router.get('/related/:id', animeController.getRelatedAnime);

module.exports = router;

