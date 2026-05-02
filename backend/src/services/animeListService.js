const UserAnime = require('../models/UserAnime');

const normalizeStatus = (status) => {
  if (!status) return status;

  switch (status) {
    case 'watching':
      return 'currently-watching';
    case 'completed':
      return 'watched-this-year';
    case 'plan-to-watch':
      return 'wishlist';
    case 'on-hold':
    case 'dropped':
      return 'wishlist';
    default:
      return status;
  }
};

const normalizeAnimeData = (animeData = {}) => {
  if (!animeData || typeof animeData !== 'object') {
    return animeData;
  }

  if (animeData.status) {
    return {
      ...animeData,
      status: normalizeStatus(animeData.status)
    };
  }

  return animeData;
};

const animeListService = {
  async addAnime(userId, animeData) {
    try {
      const normalizedAnimeData = normalizeAnimeData(animeData);
      const existingAnime = await UserAnime.findOne({
        user: userId,
        animeId: animeData.animeId
      });

      if (existingAnime) {
        const updatableFields = ['status', 'progress', 'rating', 'notes', 'titleEnglish', 'titleJapanese'];
        let isUpdated = false;

        const normalizedExistingStatus = normalizeStatus(existingAnime.status);
        if (normalizedExistingStatus && normalizedExistingStatus !== existingAnime.status) {
          existingAnime.status = normalizedExistingStatus;
          isUpdated = true;
        }

        updatableFields.forEach((field) => {
          if (normalizedAnimeData[field] !== undefined && normalizedAnimeData[field] !== existingAnime[field]) {
            existingAnime[field] = normalizedAnimeData[field];
            isUpdated = true;
          }
        });

        if (isUpdated) {
          await existingAnime.save();
          return {
            anime: existingAnime,
            action: 'updated'
          };
        }

        return {
          anime: existingAnime,
          action: 'existing'
        };
      }

      const userAnime = new UserAnime({
        ...normalizedAnimeData,
        user: userId
      });
      await userAnime.save();
      return {
        anime: userAnime,
        action: 'created'
      };
    } catch (error) {
      throw new Error(`Error adding anime: ${error.message}`);
    }
  },

  async getMyList(userId) {
    try {
      const myList = await UserAnime.find({ user: userId }).sort({ addedAt: -1 });
      return myList;
    } catch (error) {
      throw new Error(`Error fetching list: ${error.message}`);
    }
  },

  async updateAnime(userId, animeId, updateData) {
    try {
      const normalizedUpdateData = normalizeAnimeData(updateData);
      const anime = await UserAnime.findOneAndUpdate(
        { _id: animeId, user: userId },
        normalizedUpdateData,
        { returnDocument: 'after' }
      );

      if (!anime) {
        throw new Error('Anime not found in your list');
      }

      return anime;
    } catch (error) {
      throw new Error(`Error updating anime: ${error.message}`);
    }
  },

  async removeAnime(userId, animeId) {
    try {
      const deletedAnime = await UserAnime.findOneAndDelete({ _id: animeId, user: userId });

      if (!deletedAnime) {
        throw new Error('Anime not found in your list');
      }

      return { message: 'Anime removed from list' };
    } catch (error) {
      throw new Error(`Error removing anime: ${error.message}`);
    }
  },

  async getAnimeById(userId, animeId) {
    try {
      const anime = await UserAnime.findOne({ _id: animeId, user: userId });
      return anime;
    } catch (error) {
      throw new Error(`Error fetching anime: ${error.message}`);
    }
  }
};

module.exports = animeListService;
