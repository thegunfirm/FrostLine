/**
 * Sync Ammunition Categories to Algolia
 * Updates Algolia index with the new ammunition categorization based on caliber detection
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;
const BATCH_SIZE = 1000;

async function syncAmmunitionCategories() {
  try {
    console.log('🔄 Syncing updated ammunition categories to Algolia...');
    
    // Get all ammunition from database (department 18)
    const ammunition = await db.select()
      .from(products)
      .where(eq(products.departmentNumber, '18'));
    
    console.log(`📊 Found ${ammunition.length} ammunition products to update`);
    
    // Count by category
    const handgunAmmo = ammunition.filter(p => p.category === 'Handgun Ammunition');
    const rifleAmmo = ammunition.filter(p => p.category === 'Rifle Ammunition');
    const shotgunAmmo = ammunition.filter(p => p.category === 'Shotgun Ammunition');
    const rimfireAmmo = ammunition.filter(p => p.category === 'Rimfire Ammunition');
    const generalAmmo = ammunition.filter(p => p.category === 'Ammunition');
    
    console.log(`  🔫 Handgun Ammunition: ${handgunAmmo.length}`);
    console.log(`  🔫 Rifle Ammunition: ${rifleAmmo.length}`);
    console.log(`  🔫 Shotgun Ammunition: ${shotgunAmmo.length}`);
    console.log(`  🔫 Rimfire Ammunition: ${rimfireAmmo.length}`);
    console.log(`  🔫 General Ammunition: ${generalAmmo.length}`);
    
    // Process in batches
    for (let i = 0; i < ammunition.length; i += BATCH_SIZE) {
      const batch = ammunition.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ammunition.length / BATCH_SIZE)}...`);
      
      const algoliaUpdates = batch.map(product => ({
        objectID: product.sku,
        categoryName: product.category, // Updated category (specific ammunition type)
        // Include essential fields
        title: product.name,
        name: product.name,
        description: product.description,
        sku: product.sku,
        manufacturerName: product.manufacturer,
        departmentNumber: product.departmentNumber || '18',
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
    
    console.log('🎉 Ammunition categorization sync complete!');
    
    // Test the new categories
    console.log('\n🧪 Testing handgun ammunition search...');
    const handgunAmmoTest = await axios.post(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      query: '',
      filters: 'categoryName:"Handgun Ammunition"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Handgun Ammunition in Algolia: ${handgunAmmoTest.data.nbHits}`);
    
    console.log('\n🧪 Testing rifle ammunition search...');
    const rifleAmmoTest = await axios.post(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      query: '',
      filters: 'categoryName:"Rifle Ammunition"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Rifle Ammunition in Algolia: ${rifleAmmoTest.data.nbHits}`);
    
    console.log('\n🧪 Testing shotgun ammunition search...');
    const shotgunAmmoTest = await axios.post(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`, {
      query: '',
      filters: 'categoryName:"Shotgun Ammunition"',
      hitsPerPage: 5
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Shotgun Ammunition in Algolia: ${shotgunAmmoTest.data.nbHits}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncAmmunitionCategories();