const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/
    },
    passwordHash: {
      type: String,
      required: true
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
      default: function defaultDisplayName() {
        return this.username;
      }
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: ''
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: ''
    },
    lastOnline: {
      type: Date,
      default: Date.now
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    recoveryQuestion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    recoveryAnswerHash: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);