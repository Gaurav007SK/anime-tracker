const animeListService = require('../services/animeListService');

const listController = {
  async addToList(req, res) {
    try {
      const userId = req.user.id;
      const {
        animeId,
        title,
        titleEnglish,
        titleJapanese,
        image,
        score,
        episodes,
        status,
        progress,
        rating,
        notes
      } = req.body;

      if (!animeId || !title) {
        return res.status(400).json({ error: 'animeId and title are required' });
      }

      const result = await animeListService.addAnime(userId, {
        animeId,
        title,
        titleEnglish,
        titleJapanese,
        image,
        score,
        episodes,
        status,
        progress,
        rating,
        notes
      });

      const responseByAction = {
        created: {
          statusCode: 201,
          message: 'Anime added to your list.'
        },
        updated: {
          statusCode: 200,
          message: 'Anime already existed in your list. Your details were updated.'
        },
        existing: {
          statusCode: 200,
          message: 'Anime is already in your list.'
        }
      };

      const action = responseByAction[result.action] || responseByAction.created;

      res.status(action.statusCode).json({
        success: true,
        message: action.message,
        data: result.anime
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMyList(req, res) {
    try {
      const myList = await animeListService.getMyList(req.user.id);
      res.json({ success: true, data: myList });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async updateProgress(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { progress, status, rating, notes, titleEnglish, titleJapanese } = req.body;

      const anime = await animeListService.updateAnime(userId, id, {
        progress,
        status,
        rating,
        notes,
        titleEnglish,
        titleJapanese
      });

      res.json({ success: true, data: anime });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  },

  async removeFromList(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await animeListService.removeAnime(userId, id);
      res.json({ success: true, message: 'Anime removed from list' });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  }
};

module.exports = listController;
