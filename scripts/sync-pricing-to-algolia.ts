/**
 * Sync Database Pricing to Algolia
 * Updates Algolia with current database pricing after Gold discount application
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function syncPricingToAlgolia() {
  console.log('🔄 Syncing updated pricing to Algolia...');
  
  try {
    // Get sample products to verify database pricing
    const sampleProducts = await db
      .select()
      .from(products)
      .where(eq(products.distributor, 'RSR'))
      .limit(10);

    console.log('📊 Sample database pricing:');
    sampleProducts.forEach(product => {
      console.log(`${product.sku}: Bronze=$${product.priceBronze}, Gold=$${product.priceGold}, Platinum=$${product.pricePlatinum}`);
    });

    // Use HTTP request to sync pricing to Algolia via existing API
    const response = await fetch('http://localhost:5000/api/search/algolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: { category: 'Rifles' },
        page: 1,
        hitsPerPage: 3
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const searchResults = await response.json();
    
    console.log('\n📊 Current Algolia pricing:');
    searchResults.hits.forEach((hit: any) => {
      console.log(`${hit.stockNumber}: Bronze=$${hit.tierPricing.bronze}, Gold=$${hit.tierPricing.gold}, Platinum=$${hit.tierPricing.platinum}`);
    });

    // The issue is that Algolia has old pricing data
    // We need to run the complete Algolia sync script
    console.log('\n🔄 Running complete Algolia sync to update pricing...');
    
    // Import and run the complete sync script
    const { execSync } = require('child_process');
    
    try {
      execSync('npx tsx scripts/complete-algolia-sync-final.ts', { 
        stdio: 'inherit',
        cwd: process.cwd() 
      });
      
      console.log('✅ Algolia sync completed successfully');
      
    } catch (error) {
      console.error('❌ Error running complete Algolia sync:', error);
      
      // Try alternative approach - batch update pricing only
      console.log('\n🔄 Attempting direct pricing update to Algolia...');
      
      const updateResponse = await fetch('http://localhost:5000/api/admin/sync-algolia-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (updateResponse.ok) {
        console.log('✅ Direct pricing update completed');
      } else {
        console.error('❌ Direct pricing update failed');
      }
    }

    // Verify the update worked
    console.log('\n🔍 Verifying updated Algolia pricing...');
    
    const verifyResponse = await fetch('http://localhost:5000/api/search/algolia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: '',
        filters: { category: 'Rifles' },
        page: 1,
        hitsPerPage: 3
      })
    });

    if (verifyResponse.ok) {
      const verifyResults = await verifyResponse.json();
      
      console.log('📊 Updated Algolia pricing:');
      verifyResults.hits.forEach((hit: any) => {
        const bronze = parseFloat(hit.tierPricing.bronze);
        const gold = parseFloat(hit.tierPricing.gold);
        const savings = bronze - gold;
        const savingsPercent = bronze > 0 ? ((savings / bronze) * 100).toFixed(1) : '0.0';
        
        console.log(`${hit.stockNumber}: Bronze=$${bronze}, Gold=$${gold} (${savingsPercent}% savings)`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error syncing pricing to Algolia:', error);
  }
}

// Run the pricing sync
syncPricingToAlgolia().catch(console.error);