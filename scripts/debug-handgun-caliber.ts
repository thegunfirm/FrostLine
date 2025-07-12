/**
 * Debug Handgun Caliber Data
 * Check what's happening with handgun caliber data in database vs Algolia
 */

import { Pool } from 'pg';

async function debugHandgunCaliber() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging handgun caliber data...');
    
    // Check raw caliber data from database
    const dbResult = await client.query(`
      SELECT sku, caliber, LENGTH(caliber) as caliber_length
      FROM products 
      WHERE department_number = '01' 
        AND category = 'Handguns' 
        AND caliber IS NOT NULL 
        AND caliber != ''
      LIMIT 5
    `);
    
    console.log('\n📊 Database handgun caliber data:');
    dbResult.rows.forEach(row => {
      console.log(`${row.sku}: "${row.caliber}" (length: ${row.caliber_length})`);
    });
    
    // Check a specific handgun in Algolia
    const testSKU = dbResult.rows[0]?.sku;
    if (testSKU) {
      console.log(`\n🔍 Testing specific handgun SKU in Algolia: ${testSKU}`);
      
      const algoliaResponse = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/${testSKU}`, {
        headers: {
          'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
          'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        }
      });
      
      if (algoliaResponse.ok) {
        const algoliaRecord = await algoliaResponse.json();
        console.log(`✓ Algolia record for ${testSKU}:`);
        console.log(`  - caliber: "${algoliaRecord.caliber}" (type: ${typeof algoliaRecord.caliber})`);
        console.log(`  - categoryName: "${algoliaRecord.categoryName}"`);
        console.log(`  - departmentNumber: "${algoliaRecord.departmentNumber}"`);
      } else {
        console.log(`❌ Failed to get ${testSKU} from Algolia: ${algoliaResponse.status}`);
      }
    }
    
    // Test facet search for handguns
    console.log('\n🔍 Testing Algolia facet search for handguns...');
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
        maxValuesPerFacet: 10,
        hitsPerPage: 0
      })
    });
    
    if (facetSearchResponse.ok) {
      const facetResult = await facetSearchResponse.json();
      console.log(`✓ Facet search result for handguns:`);
      console.log(`  - Total hits: ${facetResult.nbHits}`);
      console.log(`  - Caliber facets:`, facetResult.facets?.caliber || 'No caliber facets');
    } else {
      console.log(`❌ Failed to get handgun facets from Algolia: ${facetSearchResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugHandgunCaliber().catch(console.error);