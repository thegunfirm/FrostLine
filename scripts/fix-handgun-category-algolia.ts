/**
 * Fix Handgun Category in Algolia
 * Correct the categoryName field for handguns in Algolia from "undefined" to "Handguns"
 */

import { Pool } from 'pg';

async function fixHandgunCategoryAlgolia() {
  console.log('🔧 Fixing handgun category names in Algolia...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    // Get all handgun products from database
    const handguns = await client.query(`
      SELECT sku, category, department_number
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns'
      ORDER BY id
    `);
    
    console.log(`Found ${handguns.rows.length} handgun products to fix`);
    
    // Prepare Algolia updates for category name
    const algoliaUpdates = handguns.rows.map(handgun => ({
      objectID: handgun.sku,
      categoryName: 'Handguns'
    }));
    
    // Send updates to Algolia in batches
    const batchSize = 1000;
    let synced = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
      const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: batch.map(update => ({
            action: 'partialUpdateObject',
            objectID: update.objectID,
            body: { categoryName: update.categoryName }
          }))
        })
      });
      
      if (response.ok) {
        synced += batch.length;
        console.log(`Fixed ${synced}/${algoliaUpdates.length} handgun categories...`);
      } else {
        console.error(`Failed to fix batch: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error details: ${errorText}`);
      }
    }
    
    console.log(`Successfully fixed ${synced} handgun categories in Algolia`);
    
    // Test the fix by checking a specific handgun
    const testSKU = handguns.rows[0]?.sku;
    if (testSKU) {
      console.log(`\n🔍 Testing fix for handgun SKU: ${testSKU}`);
      
      const testResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${testSKU}`, {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        }
      });
      
      if (testResponse.ok) {
        const record = await testResponse.json();
        console.log(`✓ ${testSKU} now has categoryName: "${record.categoryName}"`);
      } else {
        console.log(`❌ Failed to verify fix for ${testSKU}`);
      }
    }
    
    // Test facet search for handguns after the fix
    console.log('\n🔍 Testing handgun facet search after fix...');
    const facetSearchResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/search`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: 'categoryName:"Handguns"',
        facets: ['caliber'],
        maxValuesPerFacet: 15,
        hitsPerPage: 0
      })
    });
    
    if (facetSearchResponse.ok) {
      const facetResult = await facetSearchResponse.json();
      console.log(`✓ Handgun facet search now works:`);
      console.log(`  - Total handgun hits: ${facetResult.nbHits}`);
      console.log(`  - Caliber facets:`, Object.keys(facetResult.facets?.caliber || {}).slice(0, 10));
    } else {
      console.log(`❌ Handgun facet search still failing: ${facetSearchResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixHandgunCategoryAlgolia().catch(console.error);