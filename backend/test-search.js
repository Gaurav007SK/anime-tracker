const axios = require('axios');

async function testSearch() {
  const API_URL = 'http://localhost:5000/api/anime/search';

  console.log('🧪 Testing Anime Search Function\n');

  const testQueries = ['naruto', 'one piece', 'attack on titan'];

  for (const query of testQueries) {
    try {
      console.log(`📍 Searching for: "${query}"`);
      const response = await axios.get(API_URL, {
        params: { query, page: 1 }
      });

      if (response.data.success) {
        const results = response.data.data;
        console.log(`✅ Found ${results.length} results\n`);

        if (results.length > 0) {
          console.log('   Top 3 results:');
          results.slice(0, 3).forEach((anime, idx) => {
            console.log(`   ${idx + 1}. ${anime.title} (ID: ${anime.id}, Score: ${anime.score})`);
          });
        }
      } else {
        console.log('❌ Unexpected response format\n');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('\n🧪 Testing Trending Anime\n');
  try {
    console.log('📍 Fetching trending anime');
    const response = await axios.get('http://localhost:5000/api/anime/trending', {
      params: { page: 1 }
    });

    if (response.data.success) {
      const results = response.data.data;
      console.log(`✅ Found ${results.length} trending anime\n`);

      if (results.length > 0) {
        console.log('   Top 3 trending:');
        results.slice(0, 3).forEach((anime, idx) => {
          console.log(`   ${idx + 1}. ${anime.title} (Score: ${anime.score})`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }
}

testSearch();
