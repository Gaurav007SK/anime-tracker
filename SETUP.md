# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js v16+ installed
- MongoDB (local or Atlas account)

### Step 1: Clone & Install

```bash
# Navigate to backend
cd backend
npm install

# Navigate to frontend
cd ../frontend
npm install
```

### Step 2: Configure Environment

**Backend (.env file):**
```bash
cd backend
```

Create `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/anime-tracker
PORT=5000
NODE_ENV=development
```

**For MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/anime-tracker?retryWrites=true&w=majority
PORT=5000
NODE_ENV=development
```

### Step 3: Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 4: Open the App
Visit `http://localhost:5173` in your browser

## 📝 What You Can Do

✅ Search for anime by title
✅ View trending and top-rated anime
✅ Click on any anime to see full details
✅ Add anime to your personal list
✅ Track watching progress
✅ Rate anime (0-10)
✅ Add personal notes
✅ Change status (Watching, Completed, etc.)
✅ Delete entries from your list
✅ Filter by status

## 🗄️ Database Setup

### Using Local MongoDB

1. **Install MongoDB:**
   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
   - Mac: `brew tap mongodb/brew && brew install mongodb-community`
   - Linux: https://docs.mongodb.com/manual/installation/

2. **Start MongoDB:**
   ```bash
   # Windows
   mongod
   
   # Mac/Linux
   brew services start mongodb-community
   ```

3. **Verify Connection:**
   The server will log: `MongoDB connected: localhost`

### Using MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string from "Connect" → "Connect your application"
4. Update `.env` with your connection string

## ✅ Verify Everything Works

1. Backend should show:
   ```
   MongoDB connected: localhost
   Server running on http://localhost:5000
   ```

2. Frontend should show:
   ```
   Local:    http://localhost:5173/
   ```

3. Check health:
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"message":"Server is running"}
   ```

4. Search for anime:
   ```bash
   curl "http://localhost:5000/api/anime/search?query=naruto"
   ```

## 🐛 Common Issues

### MongoDB Connection Failed
- Ensure MongoDB service is running
- Check connection string in `.env`
- Verify network access (if using Atlas)

### Port Already in Use
- Backend (5000): `lsof -i :5000` then kill process
- Frontend (5173): Change in `vite.config.js`

### CORS Error
- Backend CORS is enabled by default
- Check `server.js` for `cors()` middleware

### Jikan API Rate Limit
- API limit: 60 requests/minute
- Wait a moment and retry
- Caching is enabled to help with this

## 📚 API Examples

### Search Anime
```bash
curl "http://localhost:5000/api/anime/search?query=attack%20on%20titan&page=1"
```

### Get Trending
```bash
curl "http://localhost:5000/api/anime/trending"
```

### Get Top Anime
```bash
curl "http://localhost:5000/api/anime/top"
```

### Get Anime Details
```bash
curl "http://localhost:5000/api/anime/details/1"
```

### Add to List
```bash
curl -X POST http://localhost:5000/api/list/add \
  -H "Content-Type: application/json" \
  -d '{
    "animeId": 1,
    "title": "Cowboy Bebop",
    "image": "...",
    "score": 8.78,
    "episodes": 26
  }'
```

## 🎨 Customization

### Change Port
**Backend:** Update `backend/.env` → `PORT=5001`

**Frontend:** Update `frontend/vite.config.js` → `port: 5174`

### Change Colors
Edit `frontend/src/App.css` and `index.css`:
- Primary color: `#ff6b6b` (red) → change to your color
- Dark bg: `#0f0f0f` → your color
- Secondary bg: `#1a1a1a` → your color

### Add Features
See README.md for architecture and how to add new features.

## 🚀 Production Deployment

### Backend Deployment (Heroku/Railway/Render)
1. Add `npm start` script
2. Set environment variables
3. Deploy repository

### Frontend Deployment (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist/` folder
3. Update API URL in `src/api/animeAPI.js`

---

Need help? Check the main README.md or the project structure in the docs!
