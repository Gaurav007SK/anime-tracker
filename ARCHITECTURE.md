# Anime Tracker - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│                    (localhost:5173)                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      REACT FRONTEND                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  App.jsx (Router Setup)                                      │  │
│  │  ├── Navbar (Home, My List links)                           │  │
│  │  ├── Routes:                                                │  │
│  │  │   ├── / (Home Page)                                      │  │
│  │  │   ├── /search (Search Results)                           │  │
│  │  │   ├── /my-list (User's List)                            │  │
│  │  │   └── /anime/:id (Detail Page)                          │  │
│  │  └── Footer                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  API Client (api/animeAPI.js)                               │  │
│  │  ├── searchAnime(query)                                     │  │
│  │  ├── getTrendingAnime()                                     │  │
│  │  ├── getTopAnime()                                          │  │
│  │  ├── getAnimeDetails(id)                                    │  │
│  │  ├── getMyList()                                            │  │
│  │  ├── addToList(anime)                                       │  │
│  │  ├── updateProgress(id, data)                              │  │
│  │  └── removeFromList(id)                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Components:                                                         │
│  ├── AnimeCard (Displays anime in grid)                            │
│  └── UserAnimeCard (Displays list item with edit/delete)          │
│                                                                      │
│  Pages:                                                              │
│  ├── Home (Search + Trending + Top)                               │
│  ├── SearchResults (Shows search results)                         │
│  ├── MyList (User's saved anime)                                  │
│  └── AnimeDetail (Full info + Add button)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
            Axios HTTP Requests / Responses
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND                                   │
│                  (localhost:5000/api)                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ server.js (Main Entry Point)                                 │  │
│  │ ├── app.use(cors()) - Enable cross-origin requests          │  │
│  │ ├── app.use(express.json()) - Parse JSON                    │  │
│  │ ├── connectDB() - Connect to MongoDB                        │  │
│  │ ├── app.use('/api/anime', animeRoutes)                      │  │
│  │ ├── app.use('/api/list', listRoutes)                        │  │
│  │ └── Middleware: Error handling                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────┬──────────────────────────────────┐ │
│  │ ANIME ROUTES/CONTROLLERS   │ LIST ROUTES/CONTROLLERS          │ │
│  │                            │                                  │ │
│  │ GET /search                │ GET / (getMyList)               │ │
│  │ GET /trending              │ POST /add (addToList)           │ │
│  │ GET /top                   │ PUT /:id (updateProgress)       │ │
│  │ GET /details/:id           │ DELETE /:id (removeFromList)    │ │
│  │                            │                                  │ │
│  │ ↓                          │ ↓                                │ │
│  │ animeController.js         │ listController.js               │ │
│  │ (handles requests)         │ (validates & processes)         │ │
│  │                            │                                  │ │
│  │ ↓                          │ ↓                                │ │
│  │ jikanService.js            │ animeListService.js             │ │
│  │ (business logic)           │ (database operations)           │ │
│  └────────────────────────────┴──────────────────────────────────┘ │
│           │                            │                            │
│           ↓                            ↓                            │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐ │
│  │  Jikan API           │    │  MongoDB (Database)              │ │
│  │  (External)          │    │                                  │ │
│  │  ├── /anime          │    │  Collections:                    │ │
│  │  ├── /top/anime      │    │  └── UserAnime                  │ │
│  │  └── Cache (1hr)     │    │      ├── animeId               │ │
│  │                      │    │      ├── title                 │ │
│  │  Returns:            │    │      ├── image                 │ │
│  │  ├── id              │    │      ├── score                 │ │
│  │  ├── title           │    │      ├── episodes              │ │
│  │  ├── genres          │    │      ├── status                │ │
│  │  ├── synopsis        │    │      ├── progress              │ │
│  │  └── ...             │    │      ├── rating                │ │
│  └──────────────────────┘    │      ├── notes                 │ │
│                              │      └── addedAt               │ │
│                              └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Request-Response Flow

### Example 1: Search Anime
```
User types "Naruto" in search
        ↓
Frontend: onSubmit → navigate to /search?q=naruto
        ↓
SearchResults.jsx component renders
        ↓
animeAPI.searchAnime("naruto") called
        ↓
Axios: GET /api/anime/search?query=naruto
        ↓
Backend: animeController.searchAnime()
        ↓
jikanService.searchAnime() called
        ↓
Check cache → Found? Return cached data
        ↓
No cache? → Call Jikan API
        ↓
Format response (clean data)
        ↓
Save to cache (1 hour TTL)
        ↓
Return formatted data to controller
        ↓
Controller sends response: { success: true, data: [...] }
        ↓
Frontend receives response
        ↓
Display anime cards in grid
        ↓
User clicks card → Navigate to /anime/{id}
```

### Example 2: Add Anime to List
```
User clicks "Add to List" button on detail page
        ↓
Frontend: animeAPI.addToList({ animeId, title, image, ... })
        ↓
Axios: POST /api/list/add with anime data
        ↓
Backend: listController.addToList()
        ↓
Validate required fields
        ↓
animeListService.addAnime() called
        ↓
Check if anime already in list
        ↓
If not exists → Create new UserAnime document
        ↓
Save to MongoDB
        ↓
Return saved document
        ↓
Controller sends: { success: true, data: savedAnime }
        ↓
Frontend: Show "Added to your list!" message
        ↓
Refresh My List page to show new entry
```

### Example 3: Update Anime Progress
```
User clicks "Edit" on My List item
        ↓
Opens form with fields:
  - Status dropdown
  - Progress number input
  - Rating slider
  - Notes textarea
        ↓
User changes progress from 0 to 12 episodes
        ↓
User clicks "Save"
        ↓
Frontend: animeAPI.updateProgress(id, { progress: 12, ... })
        ↓
Axios: PUT /api/list/{mongodbId} with data
        ↓
Backend: listController.updateProgress()
        ↓
animeListService.updateAnime() called
        ↓
MongoDB: Find by _id and update fields
        ↓
Return updated document
        ↓
Frontend: Hide edit form, show updated info
```

## Data Flow Summary

### Frontend → Backend
1. User action (click, input, submit)
2. React component state updates
3. API call via axios (animeAPI.js)
4. HTTP request sent (GET, POST, PUT, DELETE)

### Backend Processing
1. Route matches incoming request
2. Controller validates request
3. Service handles business logic
4. Database operation or external API call
5. Response formatted (no raw data)
6. HTTP response sent with status code

### Backend → Frontend
1. Axios promise resolves
2. State updates with response data
3. Components re-render
4. UI updates with new data

## File Responsibilities

### Backend

**server.js**
- Sets up Express app
- Connects middleware
- Defines routes
- Starts server

**database.js**
- MongoDB connection
- Connection handling

**UserAnime.js (Model)**
- Defines schema
- Validation rules
- Data structure

**animeController.js**
- Handles anime endpoints
- Validates requests
- Calls services

**listController.js**
- Handles list endpoints
- Validates data
- Calls services

**jikanService.js**
- Jikan API integration
- Caching logic
- Data formatting

**animeListService.js**
- Database CRUD
- Query operations
- Error handling

**animeRoutes.js**
- Defines anime endpoints
- Maps to controllers

**listRoutes.js**
- Defines list endpoints
- Maps to controllers

### Frontend

**App.jsx**
- Main router
- Global layout
- Route definitions

**animeAPI.js**
- Axios instance
- API method wrappers
- Base URL config

**AnimeCard.jsx**
- Displays single anime
- Grid cards

**UserAnimeCard.jsx**
- Displays list item
- Edit/delete interface

**Home.jsx**
- Search form
- Trending section
- Top anime section

**SearchResults.jsx**
- Displays search results
- Grid of cards

**MyList.jsx**
- User's anime list
- Filter dropdown
- Edit/delete actions

**AnimeDetail.jsx**
- Full anime info
- Add to list button
- Synopsis display

## Key Technologies Used

### Backend
- **Express**: Web framework, routing
- **Mongoose**: MongoDB ODM, schema validation
- **Axios**: HTTP client for Jikan API
- **CORS**: Enable cross-origin requests
- **dotenv**: Environment variable management

### Frontend
- **React**: UI library, components
- **React Router**: Client-side routing
- **Axios**: HTTP client for backend
- **Vite**: Build tool, dev server

### External Services
- **Jikan API**: Anime data source
- **MongoDB**: User data storage

## Performance Optimizations

1. **API Caching**
   - In-memory cache in jikanService
   - 1-hour TTL
   - Cache key: endpoint + params

2. **Lazy Loading**
   - Components load on route change
   - Data fetched only when needed

3. **Efficient Rendering**
   - React reconciliation
   - Key prop on lists
   - Conditional rendering

4. **Network Optimization**
   - Batch API calls where possible
   - Only fetch needed data
   - No redundant requests

## Error Handling Strategy

### Frontend
- Try-catch in API calls
- User-friendly error messages
- Fallback UI states
- Loading indicators

### Backend
- Route validation
- Service error handling
- HTTP status codes
- Error message logging

## Database Indexing

For production, add indexes:
```javascript
// UserAnime.js
userAnimeSchema.index({ animeId: 1 });
userAnimeSchema.index({ status: 1 });
userAnimeSchema.index({ addedAt: -1 });
```

## Scalability Considerations

1. **Separate concerns** - Services handle specific domains
2. **Modular structure** - Easy to add new features
3. **Caching** - Reduces external API calls
4. **Database** - Can handle millions of documents
5. **Stateless backend** - Can run multiple instances
6. **Component reusability** - DRY principle

---

This architecture ensures:
✅ Clean separation of concerns
✅ Easy to test and maintain
✅ Scalable for growth
✅ Follows industry best practices
✅ Efficient data flow
✅ Proper error handling
