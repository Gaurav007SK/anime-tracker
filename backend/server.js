require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const mongoCache = require('./src/utils/MongoCache');
const animeRoutes = require('./src/routes/animeRoutes');
const listRoutes = require('./src/routes/listRoutes');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize server with async startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('[Server] Database connection established');

    // Ensure MongoDB cache is initialized
    const cacheReady = await mongoCache.ensureReady(10000); // Wait up to 10 seconds
    if (cacheReady) {
      console.log('[Server] MongoDB cache initialized and ready');
    } else {
      console.warn('[Server] MongoDB cache not ready, continuing without persistent cache');
    }

    // Routes
    app.use('/api/anime', animeRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/list', listRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ message: 'Server is running', cacheReady });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
