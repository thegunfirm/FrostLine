/**
 * Clean FRANKFORD Products from Algolia Index
 * Removes all test FRANKFORD products from the Algolia search index
 */

// Configuration
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function cleanFrankfordFromAlgolia() {
  if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
    console.error('❌ Missing Algolia credentials');
    return;
  }

  console.log('🔄 Cleaning FRANKFORD products from Algolia...');

  try {
    // Search for FRANKFORD products
    const searchResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'FRANKFORD',
        hitsPerPage: 1000
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ Search failed:', errorText);
      return;
    }

    const searchResults = await searchResponse.json();
    console.log(`📊 Found ${searchResults.hits.length} FRANKFORD products to delete`);

    if (searchResults.hits.length === 0) {
      console.log('✅ No FRANKFORD products found');
      return;
    }

    // Delete FRANKFORD products
    const objectIDs = searchResults.hits.map((hit: any) => hit.objectID);
    
    const deleteResponse = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: objectIDs.map((objectID: string) => ({
          action: 'deleteObject',
          body: { objectID }
        }))
      })
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('❌ Delete failed:', errorText);
      return;
    }

    const deleteResults = await deleteResponse.json();
    console.log('✅ Successfully deleted FRANKFORD products from Algolia');
    console.log(`📋 Deleted ${objectIDs.length} products`);

  } catch (error) {
    console.error('❌ Error cleaning FRANKFORD products:', error);
  }
}

// Run the cleanup
cleanFrankfordFromAlgolia().catch(console.error);