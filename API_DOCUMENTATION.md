# Anime Tracker API Documentation

## Jikan API Service Improvements

This document outlines the improvements made to the anime service for better compatibility with the Jikan API.

---

## Endpoints Overview

### 1. Search Anime
**Endpoint:** `GET /api/anime/search`

```bash
curl "http://localhost:5000/api/anime/search?query=naruto&page=1&limit=25"
```

**Parameters:**
- `query` (required): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page, max 25 (default: 25)

**Response:**
```json
{
  "success": true,
  "data": [...anime objects...],
  "count": 25
}
```

---

### 2. Trending Anime
**Endpoint:** `GET /api/anime/trending`

```bash
curl "http://localhost:5000/api/anime/trending?page=1&limit=25"
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page, max 25 (default: 25)

**Uses:** `order_by=popularity&sort=asc`

---

### 3. Top-Rated Anime
**Endpoint:** `GET /api/anime/top`

```bash
curl "http://localhost:5000/api/anime/top?page=1&limit=25"
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page, max 25 (default: 25)

**Uses:** `/top/anime` endpoint

---

### 4. Anime by Genre
**Endpoint:** `GET /api/anime/genre`

```bash
# By genre name
curl "http://localhost:5000/api/anime/genre?genre=action&page=1&limit=25"

# By genre ID
curl "http://localhost:5000/api/anime/genre?genre=1&page=1&limit=25"

# Multiple genres
curl "http://localhost:5000/api/anime/genre?genre=1,2&page=1&limit=25"
```

**Parameters:**
- `genre` (required): Genre name or ID
  - Supports: `action`, `adventure`, `comedy`, `drama`, `fantasy`, `horror`, `mystery`, `psychological`, `romance`, `sci_fi`, `slice_of_life`, `sports`, `supernatural`, `thriller`, `shounen`, `shoujo`
  - Or numeric IDs: 1, 2, 4, 8, 10, 14, 7, 40, 22, 24, 36, 30, 37, 41, 27, 25
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page, max 25 (default: 25)

**Uses:** `order_by=score&sort=desc`

**Response:**
```json
{
  "success": true,
  "data": [...anime objects...],
  "count": 25,
  "genre": "action",
  "genreId": 1
}
```

---

### 5. Anime Details
**Endpoint:** `GET /api/anime/details/:id`

```bash
curl "http://localhost:5000/api/anime/details/20"
```

**Parameters:**
- `id` (required): Anime MAL ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 20,
    "title": "Naruto",
    "image": "...",
    "score": 7.75,
    "episodes": 220,
    "synopsis": "...",
    "status": "Finished Airing",
    "aired": "...",
    "genres": [
      { "id": 1, "name": "Action" },
      { "id": 2, "name": "Adventure" }
    ],
    "studios": ["Studio Pierrot"],
    "rating": "...",
    "type": "TV"
  }
}
```

---

### 6. Get All Genres
**Endpoint:** `GET /api/anime/genres`

```bash
curl "http://localhost:5000/api/anime/genres"
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Action", "count": 4000 },
    { "id": 2, "name": "Adventure", "count": 1500 },
    ...
  ],
  "count": 16,
  "localMapping": {
    "action": 1,
    "adventure": 2,
    ...
  }
}
```

---

## Key Improvements

### 1. ✅ Proper Genre Filtering
- **Before:** Mixed genre names with search query
- **After:** Uses `genres` parameter with numeric IDs only
- Backend provides mapping from genre names to IDs

### 2. ✅ Consistent Sorting
- **Trending:** `order_by=popularity&sort=asc`
- **Top Rated:** Jikan's `/top/anime` endpoint
- **Genre:** `order_by=score&sort=desc`

### 3. ✅ Better Error Handling
- Rate limit detection and reporting (HTTP 429)
- Proper validation of input parameters
- Descriptive error messages

### 4. ✅ Enhanced Caching
- 1-hour cache duration for all endpoints
- Cache key includes all parameters
- Automatic cache invalidation

### 5. ✅ Improved Data Formatting
- Genres now include both ID and name
- Null-safe access to optional fields
- Consistent response format

### 6. ✅ Request Throttling (Frontend)
- Prevents overwhelming the API
- Automatic retry on rate limits
- Queue management

---

## Genre ID Reference

| ID | Name | ID | Name |
|----|------|----|------|
| 1 | Action | 27 | Shounen |
| 2 | Adventure | 25 | Shoujo |
| 4 | Comedy | 40 | Psychological |
| 8 | Drama | 41 | Thriller |
| 10 | Fantasy | 7 | Mystery |
| 14 | Horror | 37 | Supernatural |
| 22 | Romance | 24 | Sci-Fi |
| 30 | Sports | 36 | Slice of Life |

---

## Usage in Frontend

```javascript
import { animeAPI } from '../api/animeAPI';

// Search
const results = await animeAPI.searchAnime('naruto', 1);

// Trending
const trending = await animeAPI.getTrendingAnime(1);

// Top rated
const top = await animeAPI.getTopAnime(1);

// By genre (name)
const actionAnime = await animeAPI.getAnimeByGenre('action', 1);

// By genre (ID)
const comedyAnime = await animeAPI.getAnimeByGenre(4, 1);

// Details
const details = await animeAPI.getAnimeDetails(20);

// All genres
const genres = await animeAPI.getAllGenres();
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Search query is required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Failed to fetch anime details: Anime not found: 999999"
}
```

### 429 Rate Limited
```json
{
  "success": false,
  "error": "Failed to fetch anime: Rate limited by Jikan API"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Failed to search anime: [error message]"
}
```

---

## Testing

### Quick Test Script
```bash
# Test search
curl "http://localhost:5000/api/anime/search?query=attack%20on%20titan"

# Test trending
curl "http://localhost:5000/api/anime/trending"

# Test top
curl "http://localhost:5000/api/anime/top"

# Test action genre
curl "http://localhost:5000/api/anime/genre?genre=action"

# Test drama by ID
curl "http://localhost:5000/api/anime/genre?genre=8"

# Test details
curl "http://localhost:5000/api/anime/details/16498"

# Test all genres
curl "http://localhost:5000/api/anime/genres"
```

---

## Notes

- All endpoints support pagination with `page` and `limit` parameters
- Maximum `limit` is 25 (enforced)
- Caching is 1 hour by default
- Rate limiting from Jikan API is handled gracefully
- Frontend request throttling prevents API overload
