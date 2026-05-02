const jikanService = require('../services/jikanService');

/**
 * Genre ID mapping for Jikan API
 * Reference: https://api.jikan.moe/v4/genres/anime
 */
const GENRE_MAP = {
  'action': 1,
  'adventure': 2,
  'comedy': 4,
  'drama': 8,
  'fantasy': 10,
  'horror': 14,
  'mystery': 7,
  'psychological': 40,
  'romance': 22,
  'sci_fi': 24,
  'slice_of_life': 36,
  'sports': 30,
  'supernatural': 37,
  'thriller': 41,
  'shounen': 27,
  'shoujo': 25
};

/**
 * Resolve genre name to ID
 * @param {string|number} genre - Genre name or ID
 * @returns {number|null} Genre ID or null if not found
 */
const getGenreId = (genre) => {
  const genreStr = String(genre).toLowerCase().trim();

  // If it's already a number, return it
  const genreNum = parseInt(genreStr);
  if (!isNaN(genreNum) && genreNum > 0) {
    return genreNum;
  }

  // Otherwise, look it up in the map
  return GENRE_MAP[genreStr] || null;
};

const parseIdList = (...inputs) => {
  const values = inputs
    .flat()
    .filter((item) => item !== undefined && item !== null && String(item).trim() !== '');

  const ids = values
    .flatMap((item) => String(item).split(','))
    .map((item) => parseInt(String(item).trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set(ids)].join(',');
};

const animeController = {
  /**
   * Search anime by query and filters
   */
  async searchAnime(req, res) {
    try {
      const {
        query = '',
        page = 1,
        limit = 25,
        genre,
        genres,
        theme,
        themes,
        type,
        status,
        orderBy,
        sort
      } = req.query;

      const trimmedQuery = String(query).trim();
      const genreIds = parseIdList(genre, genres);
      const themeIds = parseIdList(theme, themes);

      if (!trimmedQuery && !genreIds && !themeIds) {
        return res.status(400).json({
          success: false,
          error: 'Search query or at least one filter is required'
        });
      }

      console.log(`[Controller] Search: "${trimmedQuery}", Page: ${page}`);
      const searchResult = await jikanService.searchAnime(trimmedQuery, parseInt(page, 10), parseInt(limit, 10), {
        genreIds,
        themeIds,
        type,
        status,
        orderBy,
        sort
      });
      const results = Array.isArray(searchResult) ? searchResult : (searchResult.items || []);

      return res.json({
        success: true,
        data: results,
        count: results.length,
        page: Array.isArray(searchResult) ? parseInt(page, 10) : searchResult.page,
        hasNextPage: Array.isArray(searchResult) ? false : Boolean(searchResult.hasNextPage),
        total: Array.isArray(searchResult) ? results.length : searchResult.total,
        filters: {
          genreIds,
          themeIds,
          type: type || '',
          status: status || ''
        }
      });
    } catch (error) {
      console.error(`[Controller Error] Search failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get trending anime
   */
  async getTrendingAnime(req, res) {
    try {
      const { page = 1, limit = 25 } = req.query;

      console.log(`[Controller] Trending: Page ${page}`);
      const results = await jikanService.getTrendingAnime(parseInt(page), parseInt(limit));

      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error(`[Controller Error] Trending fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get top-rated anime
   */
  async getTopAnime(req, res) {
    try {
      const { page = 1, limit = 25 } = req.query;

      console.log(`[Controller] Top: Page ${page}`);
      const results = await jikanService.getTopAnime(parseInt(page), parseInt(limit));

      return res.json({
        success: true,
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error(`[Controller Error] Top anime fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get anime by genre
   * Accepts genre name or ID
   */
  async getAnimeByGenre(req, res) {
    try {
      const { genre, page = 1, limit = 25 } = req.query;

      if (!genre) {
        return res.status(400).json({
          success: false,
          error: 'Genre parameter is required'
        });
      }

      // Resolve genre name to ID
      const genreId = getGenreId(genre);
      if (!genreId) {
        return res.status(400).json({
          success: false,
          error: `Invalid genre: "${genre}". Supported genres: ${Object.keys(GENRE_MAP).join(', ')}`
        });
      }

      console.log(`[Controller] Genre: "${genre}" (ID: ${genreId}), Page: ${page}`);
      const results = await jikanService.getAnimeByGenre(genreId, parseInt(page), parseInt(limit));

      return res.json({
        success: true,
        data: results,
        count: results.length,
        genre: genre,
        genreId: genreId
      });
    } catch (error) {
      console.error(`[Controller Error] Genre fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get anime details
   */
  async getAnimeDetails(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Valid anime ID is required'
        });
      }

      console.log(`[Controller] Details: ID ${id}`);
      const details = await jikanService.getAnimeDetails(id);

      return res.json({
        success: true,
        data: details
      });
    } catch (error) {
      console.error(`[Controller Error] Details fetch failed: ${error.message}`);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get related seasons or similar anime
   */
  async getRelatedAnime(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Valid anime ID is required'
        });
      }

      console.log(`[Controller] Related: ID ${id}`);
      const related = await jikanService.getRelatedAnime(id);

      return res.json({
        success: true,
        data: related
      });
    } catch (error) {
      console.error(`[Controller Error] Related fetch failed: ${error.message}`);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get all available search filters
   */
  async getSearchFilters(req, res) {
    try {
      const filters = await jikanService.getSearchFilters();

      return res.json({
        success: true,
        data: filters
      });
    } catch (error) {
      console.error(`[Controller Error] Search filters fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get all available genres
   */
  async getAllGenres(req, res) {
    try {
      console.log(`[Controller] Fetching all genres`);
      const genres = await jikanService.getAllGenres();

      return res.json({
        success: true,
        data: genres,
        count: genres.length,
        localMapping: GENRE_MAP
      });
    } catch (error) {
      console.error(`[Controller Error] Genres fetch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = animeController;
