const axios = require('axios');
const globalRateLimiter = require('../utils/RateLimiter');
const mongoCache = require('../utils/MongoCache');

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// ============================================================================
// RATE LIMITED API CALL HELPER
// ============================================================================

/**
 * Make a rate-limited Jikan API request
 * Respects 3 req/sec and 60 req/min limits
 */
const makeRateLimitedRequest = async (endpoint, params) => {
  // Wait for rate limiter token
  await globalRateLimiter.acquire();
  
  // Make the request
  return axios.get(endpoint, { params });
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Read-through cache helper
 * Checks: Memory -> MongoDB -> Jikan API -> Store in both
 */
const getWithReadThroughCache = async (endpoint, params, apiFetcher, ttl = null) => {
  const cacheKey = getCacheKey(endpoint, params);

  // 1. Check in-memory LRU cache
  const memCached = getFromCache(cacheKey);
  if (memCached) {
    console.log(`[Cache Hit - Memory] ${endpoint}`);
    return memCached;
  }

  // 2. Check MongoDB cache
  const mongoCached = await mongoCache.get(endpoint, params);
  if (mongoCached) {
    console.log(`[Cache Hit - MongoDB] ${endpoint}`);
    // Restore to memory cache for next access
    setInCache(cacheKey, mongoCached);
    return mongoCached;
  }

  // 3. Fetch from Jikan API (with rate limiting)
  console.log(`[Cache Miss] Fetching from Jikan API: ${endpoint}`);
  const data = await apiFetcher();

  // 4. Store in both memory and MongoDB
  setInCache(cacheKey, data);
  await mongoCache.set(endpoint, data, params, ttl);

  return data;
};

const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour
const MAX_CACHE_ENTRIES = 500;
let lastCacheCleanup = 0;
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (endpoint, params = {}) => {
  return `${endpoint}:${JSON.stringify(params)}`;
};

const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

const cleanupExpiredCache = () => {
  const now = Date.now();

  // Avoid scanning the entire map too frequently.
  if (now - lastCacheCleanup < CACHE_CLEANUP_INTERVAL) {
    return;
  }

  for (const [key, value] of cache.entries()) {
    if (!isCacheValid(value.timestamp)) {
      cache.delete(key);
    }
  }

  lastCacheCleanup = now;
};

const enforceCacheSizeLimit = () => {
  if (cache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  // Map iteration order is insertion order, so delete oldest entries first.
  const entriesToRemove = cache.size - MAX_CACHE_ENTRIES;
  let removed = 0;

  for (const key of cache.keys()) {
    cache.delete(key);
    removed += 1;

    if (removed >= entriesToRemove) {
      break;
    }
  }
};

const getFromCache = (cacheKey) => {
  cleanupExpiredCache();

  if (!cache.has(cacheKey)) {
    return null;
  }

  const cachedValue = cache.get(cacheKey);

  if (isCacheValid(cachedValue.timestamp)) {
    // Refresh recency on access to implement true LRU behavior.
    cache.delete(cacheKey);
    cache.set(cacheKey, cachedValue);
    return cachedValue.data;
  }

  // Eagerly remove expired entry on direct access.
  cache.delete(cacheKey);
  return null;
};

const setInCache = (cacheKey, data) => {
  cleanupExpiredCache();

  // Re-insert existing key to refresh recency order for LRU.
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }

  cache.set(cacheKey, { data, timestamp: Date.now() });
  enforceCacheSizeLimit();
};

// ============================================================================
// DATA FORMATTING
// ============================================================================

const formatAnimeData = (anime) => {
  return {
    id: anime.mal_id,
    title: anime.title,
    titleEnglish: anime.title_english || null,
    titleJapanese: anime.title_japanese || null,
    image: anime.images?.jpg?.large_image_url || null,
    score: anime.score || null,
    episodes: anime.episodes || null,
    synopsis: anime.synopsis || '',
    status: anime.status || null,
    aired: anime.aired?.string || null,
    airedFrom: anime.aired?.from || null,
    airedTo: anime.aired?.to || null,
    genres: anime.genres?.map(g => ({ id: g.mal_id, name: g.name })) || [],
    studios: anime.studios?.map(s => s.name) || [],
    rating: anime.rating || null,
    type: anime.type || null,
    rank: anime.rank || null,
    popularity: anime.popularity || null,
    members: anime.members || null,
    duration: anime.duration || null,
    season: anime.season || null,
    year: anime.year || null,
    source: anime.source || null,
    trailer: {
      url: anime.trailer?.url || null,
      embedUrl: anime.trailer?.embed_url || null,
      youtubeId: anime.trailer?.youtube_id || null,
      thumbnail: anime.trailer?.images?.maximum_image_url
        || anime.trailer?.images?.large_image_url
        || anime.trailer?.images?.medium_image_url
        || null
    }
  };
};

const formatRecommendationEntry = (recommendation) => {
  const entry = recommendation?.entry || {};
  return {
    id: entry.mal_id,
    title: entry.title || 'Untitled Anime',
    titleEnglish: entry.title_english || null,
    titleJapanese: entry.title_japanese || null,
    image: entry.images?.jpg?.large_image_url || null,
    type: entry.type || null
  };
};

const normalizeSearchText = (value = '') => {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeIdList = (value) => {
  if (!value) {
    return '';
  }

  const values = Array.isArray(value)
    ? value
    : String(value).split(',');

  const ids = values
    .map((item) => parseInt(String(item).trim(), 10))
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set(ids)].join(',');
};

const computeRelevanceScore = (anime, normalizedQuery) => {
  if (!normalizedQuery) {
    return 0;
  }

  const englishTitle = normalizeSearchText(anime.titleEnglish || '');
  const mainTitle = normalizeSearchText(anime.title || '');
  const japaneseTitle = normalizeSearchText(anime.titleJapanese || '');
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  let score = 0;

  if (englishTitle === normalizedQuery) score += 300;
  if (mainTitle === normalizedQuery) score += 260;
  if (japaneseTitle === normalizedQuery) score += 220;

  if (englishTitle.startsWith(normalizedQuery)) score += 180;
  if (mainTitle.startsWith(normalizedQuery)) score += 150;
  if (japaneseTitle.startsWith(normalizedQuery)) score += 130;

  if (englishTitle.includes(normalizedQuery)) score += 120;
  if (mainTitle.includes(normalizedQuery)) score += 100;
  if (japaneseTitle.includes(normalizedQuery)) score += 80;

  for (const token of queryTokens) {
    if (englishTitle.includes(token)) score += 20;
    if (mainTitle.includes(token)) score += 15;
    if (japaneseTitle.includes(token)) score += 12;
  }

  if (anime.score) {
    score += Math.min(20, anime.score * 2);
  }

  return score;
};

const RELATION_SEASON_TYPES = new Set(['Sequel', 'Prequel']);

const SEASON_NAME_ORDER = {
  winter: 0,
  spring: 1,
  summer: 2,
  fall: 3
};

const getAnimeAiringTimestamp = (anime) => {
  if (!anime) {
    return Number.MAX_SAFE_INTEGER;
  }

  const airedFromTimestamp = anime.airedFrom ? Date.parse(anime.airedFrom) : Number.NaN;
  if (Number.isFinite(airedFromTimestamp)) {
    return airedFromTimestamp;
  }

  if (Number.isInteger(anime.year)) {
    const seasonKey = String(anime.season || '').trim().toLowerCase();
    const seasonIndex = Number.isInteger(SEASON_NAME_ORDER[seasonKey])
      ? SEASON_NAME_ORDER[seasonKey]
      : 99;

    return Date.UTC(anime.year, seasonIndex * 3, 1);
  }

  return Number.MAX_SAFE_INTEGER;
};

const sortAnimeByAiringDate = (animeList = []) => {
  return [...animeList].sort((left, right) => {
    const leftTime = getAnimeAiringTimestamp(left);
    const rightTime = getAnimeAiringTimestamp(right);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return (left.id || 0) - (right.id || 0);
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to format related anime from relation entries (lightweight, no extra detail fetch)
const formatRelatedAnimeEntry = (entry, relationType) => {
  const normalizedType = typeof relationType === 'string' ? relationType.trim() : null;

  return {
    id: entry?.mal_id,
    title: entry?.name || entry?.title || 'Untitled Anime',
    titleEnglish: entry?.title_english || null,
    titleJapanese: entry?.title_japanese || null,
    image: entry?.images?.jpg?.large_image_url || null,
    type: normalizedType
  };
};

// ============================================================================
// JIKAN SERVICE
// ============================================================================

const jikanService = {
  /**
   * Search for anime by title/query
   * Endpoint: GET /anime?q={query}
   * @param {string} query - Search query
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Results per page (default: 25, max: 25)
   * @returns {Promise<Array>} Formatted anime data
   */
  async searchAnime(query, page = 1, limit = 25, filters = {}) {
    // Validate inputs
    const hasQuery = typeof query === 'string' && query.trim() !== '';
    const genreIds = normalizeIdList(filters.genreIds);
    const themeIds = normalizeIdList(filters.themeIds);

    if (!hasQuery && !genreIds && !themeIds) {
      throw new Error('Search query or at least one filter is required');
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(25, Math.max(1, parseInt(limit) || 25));
    const trimmedQuery = hasQuery ? query.trim() : '';
    const normalizedQuery = normalizeSearchText(trimmedQuery);
    const type = filters.type ? String(filters.type).trim().toLowerCase() : '';
    const status = filters.status ? String(filters.status).trim().toLowerCase() : '';
    const orderBy = filters.orderBy ? String(filters.orderBy).trim().toLowerCase() : '';
    const sort = String(filters.sort || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const mergedGenres = [genreIds, themeIds]
      .filter(Boolean)
      .join(',');

    const params = {
      query: normalizedQuery,
      page: pageNum,
      limit: limitNum,
      genreIds,
      themeIds,
      type,
      status,
      orderBy,
      sort
    };

    try {
      // Use read-through cache pattern
      const result = await getWithReadThroughCache(
        'search',
        params,
        async () => {
          console.log(`[Jikan API] Searching anime: "${trimmedQuery}" (Page: ${pageNum}, Limit: ${limitNum})`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime`, {
            ...(trimmedQuery ? { q: trimmedQuery } : {}),
            ...(mergedGenres ? { genres: mergedGenres } : {}),
            ...(type ? { type } : {}),
            ...(status ? { status } : {}),
            ...(orderBy ? { order_by: orderBy, sort } : {}),
            page: pageNum,
            limit: limitNum,
            sfw: true
          });

          // Handle empty response
          if (!response.data?.data || response.data.data.length === 0) {
            console.log(`[Jikan API] No results found for: "${trimmedQuery}"`);
            return {
              items: [],
              page: pageNum,
              hasNextPage: false,
              total: 0
            };
          }

          const formattedData = response.data.data
            .map(formatAnimeData)
            .sort((a, b) => computeRelevanceScore(b, normalizedQuery) - computeRelevanceScore(a, normalizedQuery));
          console.log(`[Jikan API] Found ${formattedData.length} results for: "${trimmedQuery}"`);

          return {
            items: formattedData,
            page: pageNum,
            hasNextPage: Boolean(response.data?.pagination?.has_next_page),
            total: response.data?.pagination?.items?.total || formattedData.length
          };
        },
        3600000 // 1 hour TTL
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      console.error(`[Jikan API Error] Search failed: ${errorMsg}`);
      throw new Error(`Failed to search anime: ${errorMsg}`);
    }
  },

  /**
   * Fetch trending anime
   * Endpoint: GET /anime?order_by=popularity&sort=asc
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Results per page (default: 25)
   * @returns {Promise<Array>} Formatted anime data
   */
  async getTrendingAnime(page = 1, limit = 25) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(25, Math.max(1, parseInt(limit) || 25));

    const params = { page: pageNum, limit: limitNum };

    try {
      const result = await getWithReadThroughCache(
        'trending',
        params,
        async () => {
          console.log(`[Jikan API] Fetching trending anime (Page: ${pageNum}, Limit: ${limitNum})`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime`, {
            order_by: 'popularity',
            sort: 'asc',
            page: pageNum,
            limit: limitNum
          });

          if (!response.data?.data || response.data.data.length === 0) {
            console.log(`[Jikan API] No trending anime found`);
            return [];
          }

          const formattedData = response.data.data.map(formatAnimeData);
          console.log(`[Jikan API] Fetched ${formattedData.length} trending anime`);
          return formattedData;
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      console.error(`[Jikan API Error] Trending fetch failed: ${errorMsg}`);
      throw new Error(`Failed to fetch trending anime: ${errorMsg}`);
    }
  },

  /**
   * Fetch top-rated anime
   * Endpoint: GET /top/anime
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Results per page (default: 25)
   * @returns {Promise<Array>} Formatted anime data
   */
  async getTopAnime(page = 1, limit = 25) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(25, Math.max(1, parseInt(limit) || 25));

    const params = { page: pageNum, limit: limitNum };

    try {
      const result = await getWithReadThroughCache(
        'top',
        params,
        async () => {
          console.log(`[Jikan API] Fetching top anime (Page: ${pageNum}, Limit: ${limitNum})`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/top/anime`, {
            page: pageNum,
            limit: limitNum
          });

          if (!response.data?.data || response.data.data.length === 0) {
            console.log(`[Jikan API] No top anime found`);
            return [];
          }

          const formattedData = response.data.data.map(formatAnimeData);
          console.log(`[Jikan API] Fetched ${formattedData.length} top anime`);
          return formattedData;
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      console.error(`[Jikan API Error] Top anime fetch failed: ${errorMsg}`);
      throw new Error(`Failed to fetch top anime: ${errorMsg}`);
    }
  },

  /**
   * Fetch anime by genre(s)
   * Endpoint: GET /anime?genres={genre_id[,genre_id,...]}
   * @param {string|number|Array} genres - Genre ID(s): single number, comma-separated string, or array
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Results per page (default: 25)
   * @returns {Promise<Array>} Formatted anime data
   *
   * Example:
   *   getAnimeByGenre(1)              // Action
   *   getAnimeByGenre('1,2')          // Action & Adventure
   *   getAnimeByGenre([1, 2])         // Action & Adventure
   */
  async getAnimeByGenre(genres, page = 1, limit = 25) {
    // Validate and normalize genres input
    let genreIds;

    if (Array.isArray(genres)) {
      genreIds = genres
        .map(g => parseInt(g))
        .filter(g => !isNaN(g) && g > 0)
        .join(',');
    } else if (typeof genres === 'string') {
      genreIds = genres
        .split(',')
        .map(g => parseInt(g.trim()))
        .filter(g => !isNaN(g) && g > 0)
        .join(',');
    } else if (typeof genres === 'number' && genres > 0) {
      genreIds = String(genres);
    } else {
      throw new Error('Genres must be a number, comma-separated string, or array of numbers');
    }

    if (!genreIds) {
      throw new Error('At least one valid genre ID is required');
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(25, Math.max(1, parseInt(limit) || 25));

    const params = { genres: genreIds, page: pageNum, limit: limitNum };

    try {
      const result = await getWithReadThroughCache(
        'genre',
        params,
        async () => {
          console.log(`[Jikan API] Fetching anime by genre: [${genreIds}] (Page: ${pageNum}, Limit: ${limitNum})`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime`, {
            genres: genreIds,
            order_by: 'score',
            sort: 'desc',
            page: pageNum,
            limit: limitNum
          });

          if (!response.data?.data || response.data.data.length === 0) {
            console.log(`[Jikan API] No anime found for genre(s): [${genreIds}]`);
            return [];
          }

          const formattedData = response.data.data.map(formatAnimeData);
          console.log(`[Jikan API] Fetched ${formattedData.length} anime for genre(s): [${genreIds}]`);
          return formattedData;
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      console.error(`[Jikan API Error] Genre fetch failed: ${errorMsg}`);
      throw new Error(`Failed to fetch anime by genre: ${errorMsg}`);
    }
  },

  /**
   * Fetch anime details by ID
   * Endpoint: GET /anime/{id}
   * @param {number} id - Anime MAL ID
   * @returns {Promise<Object>} Formatted anime data
   */
  async getAnimeDetails(id) {
    const animeId = parseInt(id);

    if (!animeId || animeId <= 0) {
      throw new Error('Valid anime ID is required');
    }

    const params = { id: animeId };

    try {
      const result = await getWithReadThroughCache(
        'details',
        params,
        async () => {
          console.log(`[Jikan API] Fetching anime details: ID ${animeId}`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime/${animeId}`);

          if (!response.data?.data) {
            throw new Error(`Anime not found: ${animeId}`);
          }

          const formattedData = formatAnimeData(response.data.data);
          console.log(`[Jikan API] Fetched details for: ${formattedData.titleEnglish}`);
          return formattedData;
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 404
        ? `Anime not found: ${animeId}`
        : error.response?.status === 429
          ? 'Rate limited by Jikan API'
          : error.message;
      console.error(`[Jikan API Error] Details fetch failed: ${errorMsg}`);
      throw new Error(`Failed to fetch anime details: ${errorMsg}`);
    }
  },

  /**
   * Fetch anime relations (sequels, prequels, etc.)
   * Endpoint: GET /anime/{id}/relations
   * @param {number} id - Anime MAL ID
   * @returns {Promise<Array>} Raw relation data
   */
  async getAnimeRelations(id) {
    const animeId = parseInt(id);

    if (!animeId || animeId <= 0) {
      throw new Error('Valid anime ID is required');
    }

    const params = { id: animeId };

    try {
      const result = await getWithReadThroughCache(
        'relations',
        params,
        async () => {
          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime/${animeId}/relations`);
          return response.data?.data || [];
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 404
        ? `Anime not found: ${animeId}`
        : error.response?.status === 429
          ? 'Rate limited by Jikan API'
          : error.message;
      throw new Error(`Failed to fetch relations: ${errorMsg}`);
    }
  },

  /**
   * Fetch anime recommendations (similar)
   * Endpoint: GET /anime/{id}/recommendations
   * @param {number} id - Anime MAL ID
   * @returns {Promise<Array>} Recommendation entries
   */
  async getAnimeRecommendations(id) {
    const animeId = parseInt(id);

    if (!animeId || animeId <= 0) {
      throw new Error('Valid anime ID is required');
    }

    const params = { id: animeId };

    try {
      const result = await getWithReadThroughCache(
        'recommendations',
        params,
        async () => {
          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/anime/${animeId}/recommendations`);
          return response.data?.data || [];
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 404
        ? `Anime not found: ${animeId}`
        : error.response?.status === 429
          ? 'Rate limited by Jikan API'
          : error.message;
      throw new Error(`Failed to fetch recommendations: ${errorMsg}`);
    }
  },

  /**
   * Fetch direct related anime (immediate sequels/prequels) and recommendations
   * Uses single API call - NO BFS traversal to reduce API consumption
   * @param {number} id - Anime MAL ID
   * @returns {Promise<Object>} Seasons and similar anime
   */
  async getRelatedAnime(id) {
    const animeId = parseInt(id);

    if (!animeId || animeId <= 0) {
      throw new Error('Valid anime ID is required');
    }

    const params = { id: animeId };

    try {
      const result = await getWithReadThroughCache(
        'related-direct-v2',
        params,
        async () => {
          // Fetch direct relations (no BFS traversal)
          const relations = await this.getAnimeRelations(animeId);
          
          // Extract only Sequel and Prequel relations
          const directSeasons = [];
          const visitedIds = new Set([animeId]);
          
          for (const relation of relations) {
            const relationType = typeof relation?.relation === 'string' ? relation.relation.trim() : '';

            if (RELATION_SEASON_TYPES.has(relationType)) {
              for (const entry of relation.entry || []) {
                const relatedId = parseInt(entry?.mal_id, 10);
                if (Number.isInteger(relatedId) && relatedId > 0 && !visitedIds.has(relatedId)) {
                  directSeasons.push(formatRelatedAnimeEntry(entry, relationType));
                  visitedIds.add(relatedId);
                }
              }
            }
          }
          
          // Fetch recommendations for similar anime
          const recommendations = await this.getAnimeRecommendations(animeId);
          const similar = recommendations
            .map(formatRecommendationEntry)
            .filter((entry) => entry.id && entry.id !== animeId)
            .slice(0, 12);


            return {
              seasons: directSeasons,
              similar
            };
          },
          3600000
        );

      return result;
    } catch (error) {
      console.error(`[Jikan API Error] Related anime fetch failed: ${error.message}`);
      throw new Error(`Failed to fetch related anime: ${error.message}`);
    }
  },

  /**
   * Fetch all available genres
   * Endpoint: GET /genres/anime
   * @returns {Promise<Array>} List of genres with IDs and names
   */
  async getAllGenres() {
    const params = {};

    try {
      const result = await getWithReadThroughCache(
        'genres',
        params,
        async () => {
          console.log(`[Jikan API] Fetching all anime genres`);

          const response = await makeRateLimitedRequest(`${JIKAN_BASE_URL}/genres/anime`);

          if (!response.data?.data || response.data.data.length === 0) {
            console.log(`[Jikan API] No genres found`);
            return [];
          }

          const formattedGenres = response.data.data.map(genre => ({
            id: genre.mal_id,
            name: genre.name,
            count: genre.count
          }));

          console.log(`[Jikan API] Fetched ${formattedGenres.length} genres`);
          return formattedGenres;
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      console.error(`[Jikan API Error] Genres fetch failed: ${errorMsg}`);
      throw new Error(`Failed to fetch genres: ${errorMsg}`);
    }
  },

  /**
   * Fetch search filter metadata (genres + themes)
   * Endpoint: GET /genres/anime?filter=genres|themes
   * @returns {Promise<Object>} Search filters
   */
  async getSearchFilters() {
    const params = {};

    try {
      const result = await getWithReadThroughCache(
        'search-filters',
        params,
        async () => {
          const [genresResponse, themesResponse] = await Promise.all([
            makeRateLimitedRequest(`${JIKAN_BASE_URL}/genres/anime`, { filter: 'genres' }),
            makeRateLimitedRequest(`${JIKAN_BASE_URL}/genres/anime`, { filter: 'themes' })
          ]);

          const mapFilters = (items = []) => items.map((item) => ({
            id: item.mal_id,
            name: item.name,
            count: item.count || 0
          }));

          return {
            genres: mapFilters(genresResponse.data?.data || []),
            themes: mapFilters(themesResponse.data?.data || [])
          };
        },
        3600000
      );

      return result;
    } catch (error) {
      const errorMsg = error.response?.status === 429
        ? 'Rate limited by Jikan API'
        : error.message;
      throw new Error(`Failed to fetch search filters: ${errorMsg}`);
    }
  }
};

module.exports = jikanService;
