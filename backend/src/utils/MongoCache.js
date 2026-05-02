/**
 * MongoCache - Persistent cache layer using MongoDB
 * Handles read-through caching for Jikan API data
 */

const mongoose = require('mongoose');

// Define cache schemas
const cacheDetailSchema = new mongoose.Schema(
  {
    _id: String, // Cache key (e.g., "anime:123")
    endpoint: String, // API endpoint type (details, search, trending, etc)
    data: mongoose.Schema.Types.Mixed, // Cached data
    params: mongoose.Schema.Types.Mixed, // Request parameters
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true } // TTL field
  },
  { collection: 'anime_cache' }
);

// Create TTL index for automatic expiration (removes index: true to avoid duplication)
cacheDetailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Define models
const CacheModel = mongoose.model('AnimeCache', cacheDetailSchema, 'anime_cache');

class MongoCache {
  constructor(defaultTTL = 3600000) { // 1 hour default
    this.defaultTTL = defaultTTL;
    this.ready = false;
    this.initializeCollections();
  }

  /**
   * Initialize MongoDB collections
   */
  async initializeCollections() {
    try {
      // Wait for MongoDB connection to be ready (with timeout)
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (mongoose.connection.readyState !== 1) {
        console.warn('[MongoCache] MongoDB not connected after timeout');
        return;
      }

      // Check if collection exists, if not create it
      const collections = await mongoose.connection.db.listCollections().toArray();
      const cacheCollectionExists = collections.some(c => c.name === 'anime_cache');

      if (!cacheCollectionExists) {
        await mongoose.connection.db.createCollection('anime_cache');
        console.log('[MongoCache] Created anime_cache collection');
      }

      // Drop existing expiresAt index if it exists (to avoid conflicts)
      try {
        await CacheModel.collection.dropIndex('expiresAt_1');
        console.log('[MongoCache] Dropped existing expiresAt index');
      } catch (err) {
        // Index doesn't exist, which is fine
      }

      // Create TTL index with correct options
      await CacheModel.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      this.ready = true;
      console.log('[MongoCache] Initialized with TTL indexes');
    } catch (error) {
      console.error('[MongoCache] Failed to initialize:', error.message);
    }
  }

  /**
   * Generate cache key
   */
  generateKey(endpoint, params = {}) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  /**
   * Get data from MongoDB cache
   * Returns null if not found or expired
   */
  async get(endpoint, params = {}) {
    try {
      if (!this.ready || mongoose.connection.readyState !== 1) {
        return null;
      }

      const cacheKey = this.generateKey(endpoint, params);
      const cached = await CacheModel.findById(cacheKey);

      if (!cached) {
        return null;
      }

      // Check if expired (should be auto-deleted by TTL, but double-check)
      if (cached.expiresAt < Date.now()) {
        await this.delete(cacheKey);
        return null;
      }

      console.log(`[MongoCache Hit] ${endpoint}`);
      return cached.data;
    } catch (error) {
      console.error('[MongoCache] Error getting data:', error.message);
      return null;
    }
  }

  /**
   * Set data in MongoDB cache
   */
  async set(endpoint, data, params = {}, ttl = null) {
    try {
      if (!this.ready || mongoose.connection.readyState !== 1) {
        return false;
      }

      const cacheKey = this.generateKey(endpoint, params);
      const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL));

      await CacheModel.findByIdAndUpdate(
        cacheKey,
        {
          _id: cacheKey,
          endpoint,
          data,
          params,
          createdAt: new Date(),
          expiresAt
        },
        { upsert: true, returnDocument: 'after' }
      );

      return true;
    } catch (error) {
      console.error('[MongoCache] Error setting data:', error.message);
      return false;
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(cacheKey) {
    try {
      if (!this.ready) {
        return false;
      }

      await CacheModel.findByIdAndDelete(cacheKey);
      return true;
    } catch (error) {
      console.error('[MongoCache] Error deleting data:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache entries for a specific endpoint
   */
  async clearEndpoint(endpoint) {
    try {
      if (!this.ready) {
        return false;
      }

      await CacheModel.deleteMany({ endpoint });
      console.log(`[MongoCache] Cleared all cache for endpoint: ${endpoint}`);
      return true;
    } catch (error) {
      console.error('[MongoCache] Error clearing endpoint:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      if (!this.ready) {
        return false;
      }

      await CacheModel.deleteMany({});
      console.log('[MongoCache] Cleared all cache');
      return true;
    } catch (error) {
      console.error('[MongoCache] Error clearing all cache:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (!this.ready) {
        return null;
      }

      const count = await CacheModel.countDocuments();
      const totalSize = await CacheModel.aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: { $bsonSize: '$$ROOT' } }
          }
        }
      ]);

      return {
        totalDocuments: count,
        totalSizeBytes: totalSize.length > 0 ? totalSize[0].totalSize : 0,
        defaultTTL: this.defaultTTL
      };
    } catch (error) {
      console.error('[MongoCache] Error getting stats:', error.message);
      return null;
    }
  }

  /**
   * Wait for MongoDB connection to be ready
   */
  async ensureReady(maxWait = 5000) {
    const startTime = Date.now();
    while (!this.ready && Date.now() - startTime < maxWait) {
      await new Promise(r => setTimeout(r, 100));
    }
    return this.ready;
  }
}

// Create and export singleton instance
const mongoCache = new MongoCache(3600000); // 1 hour TTL

module.exports = mongoCache;
