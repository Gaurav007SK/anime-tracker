# Search Function Troubleshooting Guide

## Testing the Search Function

### Step 1: Check Backend Connection

1. **Start the backend:**
```bash
cd backend
npm run dev
```

You should see:
```
MongoDB connected: localhost
Server running on http://localhost:5000
```

2. **Test health endpoint:**
```bash
curl http://localhost:5000/api/health
# Should return: {"message":"Server is running"}
```

### Step 2: Test Search API Directly

Open your terminal and test the search endpoint:

```bash
# Test search for "naruto"
curl "http://localhost:5000/api/anime/search?query=naruto"

# Test search for "attack on titan"
curl "http://localhost:5000/api/anime/search?query=attack%20on%20titan"

# Test with page parameter
curl "http://localhost:5000/api/anime/search?query=naruto&page=1"
```

You should get a JSON response:
```json
{
  "success": true,
  "data": [
    {
      "id": 20,
      "title": "Naruto",
      "image": "...",
      "score": 7.75,
      "episodes": 220,
      ...
    },
    ...
  ]
}
```

### Step 3: Check Browser Console

1. **Open DevTools:** Press `F12` or `Ctrl+Shift+I`
2. **Go to Console tab**
3. **Try searching from the app**
4. **Look for logs like:**
   - `[Home] Fetching trending and top anime...`
   - `[Search] Query: "naruto", Page: 1`
   - `[Jikan API] Found 25 results for: naruto`

### Step 4: Check Network Tab

1. Open DevTools → **Network tab**
2. **Search for "naruto"** in the app
3. Look for request to `/api/anime/search?query=naruto`
4. Click on it and check:
   - **Status:** Should be 200
   - **Response:** Should contain `{ success: true, data: [...] }`

## Common Issues & Solutions

### Issue 1: "No anime found" or blank results

**Possible Causes:**
- Jikan API is slow/rate-limited
- Backend not running
- Search query not being sent

**Solutions:**

1. **Check backend is running:**
```bash
# Terminal 1
cd backend
npm run dev
# Should show: Server running on http://localhost:5000
```

2. **Check server logs for errors:**
Look at the backend terminal - there should be console logs like:
```
[Search] Query: "naruto", Page: 1
[Jikan API] Searching for: naruto, Page: 1
[Jikan API] Found 25 results for: naruto
```

3. **Test Jikan API directly:**
```bash
# Test if Jikan API is working
curl "https://api.jikan.moe/v4/anime?query=naruto&limit=5"
```

If this fails, the Jikan API might be down. Wait a moment and retry.

### Issue 2: CORS Error in browser console

**Error Message:**
```
Access to XMLHttpRequest at 'http://localhost:5000/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
1. Stop backend (Ctrl+C)
2. Check `backend/server.js` has `app.use(cors());` at the top
3. Restart backend

### Issue 3: 404 Error - Cannot POST /api/list/add

**Cause:** Routes not loading properly

**Solution:**
1. Check `backend/server.js` has these lines:
```javascript
app.use('/api/anime', animeRoutes);
app.use('/api/list', listRoutes);
```

2. Verify route files exist:
   - `backend/src/routes/animeRoutes.js`
   - `backend/src/routes/listRoutes.js`

3. Restart backend: `npm run dev`

### Issue 4: Jikan API Rate Limited

**Error:** 
```
429 Too Many Requests
```

**Why:** Jikan API limit is 60 requests/minute

**Solution:**
- Wait 1 minute before trying again
- Use search results are cached (1 hour), so repeat searches are instant
- Don't refresh the page repeatedly

### Issue 5: MongoDB Connection Error

**Error in backend:**
```
Error: Error connecting to MongoDB
```

**Solutions:**

1. **If using local MongoDB:**
```bash
# Start MongoDB service
# Windows: Open Services and start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

2. **If using MongoDB Atlas:**
   - Check connection string in `.env`
   - Verify username/password
   - Add your IP to Network Access

3. **Test connection:**
```bash
# On Windows: Open Command Prompt
mongosh "mongodb://localhost:27017"

# Should connect successfully
```

## Debugging Steps

### 1. Check All Services Running

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Should show: `Server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Should show: `Local: http://localhost:5173/`

**Terminal 3 - MongoDB (if local):**
```bash
# Windows: mongod (already started)
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### 2. Test Search API

```bash
curl -v "http://localhost:5000/api/anime/search?query=naruto"
```

Check response:
- **Headers:** Status 200?
- **Body:** Has `success: true` and `data` array?

### 3. Check Frontend Console (F12)

Search for "naruto" and look for:
- `[Search] Query: "naruto", Page: 1`
- `[Jikan API] Found X results for: naruto`
- Network request showing status 200

### 4. Verify API URL

In `frontend/src/api/animeAPI.js`, check:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

Must match backend port!

## Advanced Debugging

### Enable Verbose Logging

**In backend/server.js, after `connectDB()`, add:**
```javascript
// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

### Test Search with Different Queries

Try these test searches:
- `"naruto"` - Popular anime
- `"one piece"` - Long series
- `"spy x family"` - Recent anime
- `"a"` - Single letter (should return results)
- `""` - Empty string (should return error)

### Monitor Jikan API Status

Visit: https://api.jikan.moe/v4/top/anime

If this fails, Jikan API might be down. Try again in a few minutes.

## Still Not Working?

1. **Restart everything:**
```bash
# Kill all processes (Ctrl+C in each terminal)
# Clear cache (browser: Ctrl+Shift+Delete)
# Delete backend/.env cache variable: NODE_ENV=test
# Restart all servers
```

2. **Check for typos:**
   - Search query isn't empty
   - API URL has correct port (5000)
   - MongoDB URI is correct

3. **Try different search terms:**
   - Very common terms: "naruto", "one piece"
   - Less common: "sangatsu", "hyouka"
   - See which work/don't work

4. **Check Error Messages:**
   - Frontend console (F12)
   - Backend terminal (npm run dev)
   - Network tab (F12 → Network)

## Quick Fixes

### Slow Search Response?
- First search is slow (calls Jikan API)
- Same search is instant (uses cache)
- Wait 2-3 seconds for Jikan API response

### Blank Cards in Results?
- Some anime don't have images
- Cards should still show title and score
- Check browser console for errors

### Browser Still Showing Old Results?
- Clear cache: Ctrl+Shift+Delete
- Restart frontend: Stop and `npm run dev` again

---

**Need Help?** Check the browser console (F12) - it shows detailed error messages and API responses!
