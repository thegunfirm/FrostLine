/**
 * Sync Rifle and Shotgun Categories to Algolia
 * Updates Algolia index with the new rifle/shotgun categorization based on gauge detection
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { or, eq } from "drizzle-orm";
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const BATCH_SIZE = 1000;

async function syncRifleShotgunCategories() {
  try {
    console.log('🔄 Syncing updated rifle and shotgun categories to Algolia...');
    
    // Get all rifles and shotguns from database
    const riflesAndShotguns = await db.select()
      .from(products)
      .where(or(
        eq(products.category, 'Rifles'),
        eq(products.category, 'Shotguns')
      ));
    
    console.log(`📊 Found ${riflesAndShotguns.length} rifles and shotguns to update`);
    
    const rifles = riflesAndShotguns.filter(p => p.category === 'Rifles');
    const shotguns = riflesAndShotguns.filter(p => p.category === 'Shotguns');
    
    console.log(`  🔫 Rifles: ${rifles.length}`);
    console.log(`  🔫 Shotguns: ${shotguns.length}`);
    
    // Process in batches
    for (let i = 0; i < riflesAndShotguns.length; i += BATCH_SIZE) {
      const batch = riflesAndShotguns.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(riflesAndShotguns.length / BATCH_SIZE)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        categoryName: product.category, // Updated category (Rifles or Shotguns)
        // Include essential fields
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        departmentNumber: product.departmentNumber || '05',
        tierPricing: {
          bronze: parseFloat(product.priceBronze || '0'),
          gold: parseFloat(product.priceGold || '0'),
          platinum: parseFloat(product.pricePlatinum || '0')
        },
        inventory: {
          onHand: product.stockQuantity || 0,
          allocated: product.allocated === 'Y'
        },
        inStock: product.inStock,
        distributor: product.distributor,
        tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : []
      }));
      
      // Update Algolia
      const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
      
      const payload = {
        requests: algoliaUpdates.map(product => ({
          action: 'updateObject',
          body: product
        }))
      };
      
      const response = await axios.post(algoliaUrl, payload, {
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ Updated ${response.data.objectIDs?.length || batch.length} products in Algolia`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 Rifle and shotgun categorization sync complete!');
    
    // Test the new categories
    console.log('\n🧪 Testing rifle search...');
    const rifleTest = await axios.post(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      query: '',
      filters: 'categoryName:"Rifles"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Rifles in Algolia: ${rifleTest.data.nbHits}`);
    
    console.log('\n🧪 Testing shotgun search...');
    const shotgunTest = await axios.post(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      query: '',
      filters: 'categoryName:"Shotguns"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Shotguns in Algolia: ${shotgunTest.data.nbHits}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncRifleShotgunCategories();