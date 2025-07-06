/**
 * Verify Algolia Index Status
 * Tests search functionality and counts indexed products
 */

const https = require('https');

function makeAlgoliaRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${process.env.ALGOLIA_APP_ID}-dsn.algolia.net`,
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedData.message || responseData}`));
          }
        } catch (error) {
          resolve(responseData); // Return raw data if JSON parse fails
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function verifyAlgolia() {
  try {
    console.log('🔍 Verifying Algolia search index...');
    
    // Test 1: Search with empty query to get total count
    try {
      const searchResult = await makeAlgoliaRequest('GET', '/1/indexes/products/search', {
        query: '',
        hitsPerPage: 5
      });
      
      if (searchResult.nbHits) {
        console.log(`✅ Search working! Found ${searchResult.nbHits} total products`);
        console.log(`📦 Sample products:`);
        searchResult.hits.slice(0, 3).forEach((hit, i) => {
          console.log(`   ${i + 1}. ${hit.title} (${hit.manufacturerName})`);
        });
      } else {
        console.log('❌ Search returned no results');
      }
    } catch (searchError) {
      console.log('❌ Search failed:', searchError.message);
    }

    // Test 2: Search for specific terms
    const testQueries = ['Glock', 'rifle', 'ammunition', 'scope'];
    
    for (const query of testQueries) {
      try {
        const result = await makeAlgoliaRequest('GET', '/1/indexes/products/search', {
          query: query,
          hitsPerPage: 3
        });
        
        if (result.nbHits && result.nbHits > 0) {
          console.log(`✅ "${query}" search: ${result.nbHits} results`);
        } else {
          console.log(`❌ "${query}" search: no results`);
        }
      } catch (error) {
        console.log(`❌ "${query}" search failed:`, error.message);
      }
    }

    // Test 3: Check specific product by objectID
    try {
      const objectResult = await makeAlgoliaRequest('GET', '/1/indexes/products/rsr-19369');
      console.log('✅ Direct object retrieval working');
    } catch (error) {
      console.log('❌ Direct object retrieval failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyAlgolia()
  .then(() => {
    console.log('✅ Algolia verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  });