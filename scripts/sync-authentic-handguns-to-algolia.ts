/**
 * Sync Authentic Handguns to Algolia
 * Updates only the 27 authentic handgun products that require FFL
 */

import { db } from '../server/db';
import { products } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import axios from 'axios';

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

async function syncAuthenticHandgunsToAlgolia() {
  try {
    if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY) {
      console.error('❌ Missing Algolia credentials');
      return;
    }
    
    console.log('🔄 Starting authentic handgun sync to Algolia...');
    
    // Get only authentic handgun products that require FFL
    const authenticHandguns = await db.select()
      .from(products)
      .where(and(
        eq(products.requiresFFL, true),
        eq(products.category, 'Handguns')
      ));
    
    console.log(`📊 Found ${authenticHandguns.length} authentic handgun products to sync`);
    
    if (authenticHandguns.length === 0) {
      console.log('❌ No authentic handguns found - checking database...');
      
      // Debug: Check what we have
      const allHandguns = await db.select()
        .from(products)
        .where(eq(products.category, 'Handguns'));
        
      const fflProducts = await db.select()
        .from(products)
        .where(eq(products.requiresFFL, true));
        
      console.log(`🔍 Total handgun products: ${allHandguns.length}`);
      console.log(`🔍 Total FFL products: ${fflProducts.length}`);
      return;
    }
    
    // Show the authentic handguns we found
    console.log('🔫 Authentic handguns found:');
    authenticHandguns.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} (${product.sku}) - FFL: ${product.requiresFFL}`);
    });
    
    // Sync to Algolia
    const algoliaUpdates = authenticHandguns.map(product => ({
      objectID: product.sku,
      requiresFFL: product.requiresFFL,
      title: product.name,
      name: product.name,
      description: product.description,
      sku: product.sku,
      manufacturerName: product.manufacturer,
      categoryName: product.category,
      subcategoryName: product.subcategoryName || undefined,
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
    
    const algoliaUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`;
    
    const payload = {
      requests: algoliaUpdates.map(product => ({
        action: 'updateObject',
        body: product
      }))
    };
    
    console.log('🔄 Syncing authentic handguns to Algolia...');
    const response = await axios.post(algoliaUrl, payload, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ Synced ${response.data.objectIDs?.length || 0} authentic handgun products`);
    
    // Test the authentic handgun filter
    console.log('\n🧪 Testing authentic handgun filtering...');
    const testUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/query`;
    
    // Wait a moment for Algolia to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const handgunTest = await axios.post(testUrl, {
      query: '',
      filters: 'categoryName:"Handguns" AND requiresFFL:true',
      hitsPerPage: 10
    }, {
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔫 Authentic handguns in Algolia: ${handgunTest.data.nbHits} results`);
    console.log('Sample authentic handgun results:');
    handgunTest.data.hits.forEach((hit: any, index: number) => {
      console.log(`  ${index + 1}. ${hit.title} (requiresFFL: ${hit.requiresFFL})`);
    });
    
    console.log('\n🎉 Authentic handgun sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error syncing authentic handguns to Algolia:', error);
  }
}

syncAuthenticHandgunsToAlgolia().then(() => {
  console.log('Authentic handgun sync completed');
}).catch(console.error);