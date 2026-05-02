import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_STORAGE_KEY = 'anime_tracker_auth';

let authToken = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const setAuthToken = (token) => {
  authToken = token || null;
};

api.interceptors.request.use((config) => {
  if (!authToken) {
    try {
      const persistedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
      authToken = persistedAuth?.token || null;
    } catch {
      authToken = null;
    }
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

// Simple request cache to prevent duplicate requests
const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedRequest = async (cacheKey, requestFn) => {
  const cached = requestCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  const response = await requestFn();
  requestCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });

  return response;
};

export const animeAPI = {
  searchAnime: (query, page = 1, limit = 25, filters = {}) => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const normalizedFilters = {
      genre: filters.genre ? String(filters.genre).trim() : '',
      theme: filters.theme ? String(filters.theme).trim() : '',
      type: filters.type ? String(filters.type).trim().toLowerCase() : '',
      status: filters.status ? String(filters.status).trim().toLowerCase() : '',
      orderBy: filters.orderBy ? String(filters.orderBy).trim().toLowerCase() : '',
      sort: filters.sort && String(filters.sort).toLowerCase() === 'asc' ? 'asc' : 'desc'
    };

    const params = {
      query: normalizedQuery,
      page,
      limit,
      ...(normalizedFilters.genre ? { genre: normalizedFilters.genre } : {}),
      ...(normalizedFilters.theme ? { theme: normalizedFilters.theme } : {}),
      ...(normalizedFilters.type ? { type: normalizedFilters.type } : {}),
      ...(normalizedFilters.status ? { status: normalizedFilters.status } : {}),
      ...(normalizedFilters.orderBy ? { orderBy: normalizedFilters.orderBy, sort: normalizedFilters.sort } : {})
    };

    const filterKey = JSON.stringify(normalizedFilters);
    return getCachedRequest(`search:${normalizedQuery}:${page}:${limit}:${filterKey}`, () =>
      api.get('/anime/search', { params })
    );
  },

  getSearchFilters: () =>
    getCachedRequest('search:filters', () =>
      api.get('/anime/search/filters')
    ),

  getTrendingAnime: (page = 1) =>
    getCachedRequest(`trending:${page}`, () =>
      api.get('/anime/trending', { params: { page } })
    ),

  getTopAnime: (page = 1) =>
    getCachedRequest(`top:${page}`, () =>
      api.get('/anime/top', { params: { page } })
    ),

  getAnimeByGenre: (genre, page = 1) =>
    getCachedRequest(`genre:${genre}:${page}`, () =>
      api.get('/anime/genre', { params: { genre, page } })
    ),

  getAnimeDetails: (id) =>
    getCachedRequest(`details:${id}`, () =>
      api.get(`/anime/details/${id}`)
    ),

  getRelatedAnime: (id) =>
    getCachedRequest(`related:${id}`, () =>
      api.get(`/anime/related/${id}`)
    ),

  // List operations
  getMyList: () => api.get('/list'),
  addToList: (anime) => api.post('/list/add', anime),
  updateProgress: (id, data) => api.put(`/list/${id}`, data),
  removeFromList: (id) => api.delete(`/list/${id}`)
};

export const authAPI = {
  signup: (payload) => api.post('/auth/signup', payload),
  login: (payload) => api.post('/auth/login', payload),
  getRecoveryQuestion: (username) => api.post('/auth/recovery-question', { username }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  getMe: () => api.get('/auth/me')
};

export default api;
