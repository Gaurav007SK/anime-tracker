# Anime Tracker - Full Stack Application

A minimal but functional anime tracker web application built with Node.js, Express, MongoDB, and React. Users can search for anime, track their watching progress, and manage their personal anime list.

## Features

✨ **Core Features:**
- 🔍 Search anime using the Jikan API
- 📊 View trending and top-rated anime
- 📝 Add anime to personal list
- 📈 Track watching progress (episodes watched)
- ⭐ Rate and review anime
- 💾 Manage status (Watching, Completed, On Hold, Dropped, Plan to Watch)
- 🎨 Dark-themed, responsive UI

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB (with Mongoose)
- Jikan API (anime data)
- Axios (HTTP client)

**Frontend:**
- React 19
- React Router v6
- Axios (API calls)
- Vite (build tool)
- CSS3 (responsive design)

## Project Structure

```
anime-tracker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── animeController.js   # Anime search & details
│   │   │   └── listController.js    # User list operations
│   │   ├── models/
│   │   │   └── UserAnime.js         # MongoDB schema
│   │   ├── routes/
│   │   │   ├── animeRoutes.js       # Anime endpoints
│   │   │   └── listRoutes.js        # List endpoints
│   │   ├── services/
│   │   │   ├── jikanService.js      # Jikan API integration
│   │   │   └── animeListService.js  # Database operations
│   ├── .env                         # Environment variables
│   ├── server.js                    # Express server entry
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── animeAPI.js          # API client
    │   ├── components/
    │   │   ├── AnimeCard.jsx        # Anime card display
    │   │   └── UserAnimeCard.jsx    # List item card
    │   ├── pages/
    │   │   ├── Home.jsx             # Home with search
    │   │   ├── SearchResults.jsx    # Search results
    │   │   ├── MyList.jsx           # User's anime list
    │   │   └── AnimeDetail.jsx      # Detailed anime view
    │   ├── styles/
    │   │   ├── Home.css
    │   │   ├── AnimeCard.css
    │   │   ├── SearchResults.css
    │   │   ├── MyList.css
    │   │   ├── UserAnimeCard.css
    │   │   └── AnimeDetail.css
    │   ├── App.jsx                  # Main app component
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## API Endpoints

### Anime Endpoints
- `GET /api/anime/search?query=naruto&page=1` - Search anime
- `GET /api/anime/trending?page=1` - Get trending anime
- `GET /api/anime/top?page=1` - Get top-rated anime
- `GET /api/anime/details/:id` - Get anime details

### List Endpoints
- `GET /api/list` - Get user's anime list
- `POST /api/list/add` - Add anime to list
- `PUT /api/list/:id` - Update anime progress/status
- `DELETE /api/list/:id` - Remove anime from list

## Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/anime-tracker
PORT=5000
NODE_ENV=development
```

For MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/anime-tracker
PORT=5000
NODE_ENV=development
```

4. **Start the server:**
```bash
npm run dev    # Development with auto-reload
# or
npm start      # Production
```

The server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

The app runs on `http://localhost:5173` by default

4. **Build for production:**
```bash
npm run build
```

## Usage

1. **Start both servers:**
   - Backend: `npm run dev` in the `backend/` folder
   - Frontend: `npm run dev` in the `frontend/` folder

2. **Open the app:**
   - Visit `http://localhost:5173` in your browser

3. **Features:**
   - Search for anime in the search bar
   - Click on any anime card to view details
   - Add anime to your personal list
   - Manage progress, status, and ratings
   - Filter your list by status
   - Edit or delete entries anytime

## Code Architecture

### Clean Architecture Principles
- **Separation of Concerns:** Routes → Controllers → Services
- **Single Responsibility:** Each function has one purpose
- **DRY (Don't Repeat Yourself):** Reusable services and utilities
- **Error Handling:** Proper error messages and status codes

### Backend Flow
```
Frontend Request
    ↓
Router (animeRoutes.js / listRoutes.js)
    ↓
Controller (animeController.js / listController.js)
    ↓
Service (jikanService.js / animeListService.js)
    ↓
Database (MongoDB) or External API (Jikan)
    ↓
Response to Frontend
```

### Caching Strategy
- In-memory cache for Jikan API responses (1 hour TTL)
- Reduces API calls and improves performance
- Cache key: endpoint + parameters

## Performance Optimizations

✅ **API Caching:** Reduce repeated calls to Jikan API
✅ **Lazy Loading:** Load data on demand
✅ **Responsive Design:** Works on all screen sizes
✅ **Error Handling:** Graceful error messages
✅ **Async/Await:** Non-blocking operations

## Styling & UI

- **Color Scheme:** Dark theme with red accents (#ff6b6b)
- **Typography:** Clean, readable fonts
- **Responsive:** Mobile-first design
- **Animations:** Smooth transitions and hover effects

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=<your-mongodb-connection-string>
PORT=5000
NODE_ENV=development
```

### Frontend (src/api/animeAPI.js)
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## MongoDB Schema

### UserAnime Collection
```javascript
{
  animeId: Number,          // Jikan anime ID
  title: String,            // Anime title
  image: String,            // Anime poster URL
  score: Number,            // Jikan score
  episodes: Number,         // Total episodes
  status: String,           // watching, completed, etc.
  progress: Number,         // Episodes watched
  rating: Number,           // User's rating (0-10)
  notes: String,            // User's notes
  addedAt: Date             // When added to list
}
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running locally or check Atlas connection string
- Verify credentials in `.env` file

### API Not Responding
- Check if backend server is running on port 5000
- Verify CORS is enabled in `server.js`

### Frontend Build Error
- Delete `node_modules` and run `npm install` again
- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)

### Jikan API Rate Limiting
- The API has rate limits (60 requests per minute)
- Caching helps reduce requests
- Wait if you hit the limit

## Future Enhancements

- 🔐 User authentication & profiles
- 📱 Mobile app version
- 💬 Community reviews & comments
- 🎯 Personalized recommendations
- 📊 Advanced statistics & analytics
- 🔔 Notification system
- 🌐 Multiple language support
- 📥 Import/Export functionality

## API Credit

Data provided by [Jikan API](https://jikan.moe/) - the unofficial MyAnimeList API.

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, check the [Jikan API documentation](https://docs.api.jikan.moe/) or the project repository.