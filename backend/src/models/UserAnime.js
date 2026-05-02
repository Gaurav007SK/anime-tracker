const mongoose = require('mongoose');

const userAnimeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  animeId: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  titleEnglish: {
    type: String
  },
  titleJapanese: {
    type: String
  },
  image: String,
  score: Number,
  episodes: Number,
  status: {
    type: String,
    enum: ['currently-watching', 'watched-this-year', 'wishlist'],
    default: 'wishlist'
  },
  progress: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 10
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: String
});

userAnimeSchema.index({ user: 1, animeId: 1 }, { unique: true });

module.exports = mongoose.model('UserAnime', userAnimeSchema);
