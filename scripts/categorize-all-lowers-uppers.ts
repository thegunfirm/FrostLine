/**
 * Categorize All Lowers and Uppers
 * Moves all lower receivers (pistol and rifle) and upper receivers to "Uppers/Lowers" category
 * Adds receiverType field to distinguish between "Handgun Lower", "Rifle Lower", and "Upper"
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function categorizeAllLowersUppers() {
  console.log('🔧 Categorizing all lowers and uppers...');
  
  try {
    // Step 1: Identify all lower receivers (both pistol and rifle)
    console.log('📋 Step 1: Identifying all lower receivers...');
    
    const lowerPatterns = [
      'LOWER',
      'RCVR',
      'RECEIVER',
      'STRIPPED LOWER',
      'COMPLETE LOWER',
      'BILLET LOWER',
      'FORGED LOWER',
      'LOWER GROUP',
      'LOWER ASSEMBLY',
      'LOWER KIT'
    ];
    
    const upperPatterns = [
      'UPPER',
      'UPPER RECEIVER',
      'UPPER ASSEMBLY',
      'UPPER GROUP',
      'COMPLETE UPPER',
      'STRIPPED UPPER',
      'BILLET UPPER',
      'FORGED UPPER'
    ];
    
    // Build SQL conditions for lowers
    const lowerConditions = lowerPatterns.map(pattern => 
      `name ILIKE '%${pattern}%'`
    ).join(' OR ');
    
    // Build SQL conditions for uppers
    const upperConditions = upperPatterns.map(pattern => 
      `name ILIKE '%${pattern}%'`
    ).join(' OR ');
    
    // Find all products that match lower patterns
    const lowerProducts = await db.execute(sql`
      SELECT id, name, sku, department_number, manufacturer, category
      FROM products 
      WHERE (${sql.raw(lowerConditions)})
      AND category NOT IN ('Uppers/Lowers')
      ORDER BY name
    `);
    
    // Find all products that match upper patterns
    const upperProducts = await db.execute(sql`
      SELECT id, name, sku, department_number, manufacturer, category
      FROM products 
      WHERE (${sql.raw(upperConditions)})
      AND category NOT IN ('Uppers/Lowers')
      ORDER BY name
    `);
    
    console.log(`📊 Found ${lowerProducts.rows.length} lower receivers to categorize`);
    console.log(`📊 Found ${upperProducts.rows.length} upper receivers to categorize`);
    
    // Step 2: Categorize lowers by type (handgun vs rifle)
    console.log('📋 Step 2: Categorizing lowers by type...');
    
    const handgunLowers = [];
    const rifleLowers = [];
    const algoliaUpdates = [];
    
    for (const product of lowerProducts.rows) {
      // Determine if it's a handgun or rifle lower
      const isHandgunLower = product.department_number === '01' || 
                            product.name.includes('PISTOL') || 
                            product.name.includes('PSTL') ||
                            product.name.includes('HANDGUN');
      
      if (isHandgunLower) {
        handgunLowers.push(product);
      } else {
        rifleLowers.push(product);
      }
      
      // Prepare database update
      await db.execute(sql`
        UPDATE products 
        SET category = 'Uppers/Lowers',
            department_number = '41',
            receiver_type = ${isHandgunLower ? 'Handgun Lower' : 'Rifle Lower'}
        WHERE id = ${product.id}
      `);
      
      // Prepare Algolia update
      algoliaUpdates.push({
        action: 'partialUpdateObject',
        body: {
          objectID: product.sku,
          categoryName: 'Uppers/Lowers',
          departmentNumber: '41',
          receiverType: isHandgunLower ? 'Handgun Lower' : 'Rifle Lower'
        }
      });
    }
    
    // Step 3: Categorize uppers
    console.log('📋 Step 3: Categorizing uppers...');
    
    for (const product of upperProducts.rows) {
      // All uppers go to Uppers/Lowers category
      await db.execute(sql`
        UPDATE products 
        SET category = 'Uppers/Lowers',
            department_number = '41',
            receiver_type = 'Upper'
        WHERE id = ${product.id}
      `);
      
      // Prepare Algolia update
      algoliaUpdates.push({
        action: 'partialUpdateObject',
        body: {
          objectID: product.sku,
          categoryName: 'Uppers/Lowers',
          departmentNumber: '41',
          receiverType: 'Upper'
        }
      });
    }
    
    // Step 4: Update Algolia in batches
    console.log('📋 Step 4: Updating Algolia search index...');
    
    const batchSize = 100;
    let updatedCount = 0;
    
    for (let i = 0; i < algoliaUpdates.length; i += batchSize) {
      const batch = algoliaUpdates.slice(i, i + batchSize);
      
      try {
        const response = await fetch(`https://${process.env.ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/products/batch`, {
          method: 'POST',
          headers: {
            'X-Algolia-API-Key': process.env.ALGOLIA_ADMIN_API_KEY!,
            'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: batch
          })
        });
        
        if (response.ok) {
          updatedCount += batch.length;
          console.log(`✅ Updated batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(algoliaUpdates.length / batchSize)}`);
        } else {
          console.error(`❌ Algolia batch update failed for batch ${i}-${i + batchSize}`);
        }
      } catch (error) {
        console.error(`❌ Error updating batch ${i}-${i + batchSize}:`, error);
      }
    }
    
    // Step 5: Summary
    console.log('🎯 Categorization complete:');
    console.log(`   • Handgun lowers moved: ${handgunLowers.length}`);
    console.log(`   • Rifle lowers moved: ${rifleLowers.length}`);
    console.log(`   • Uppers moved: ${upperProducts.rows.length}`);
    console.log(`   • Total products categorized: ${lowerProducts.rows.length + upperProducts.rows.length}`);
    console.log(`   • Algolia updates: ${updatedCount}`);
    console.log('✅ All lowers and uppers successfully categorized');
    
  } catch (error) {
    console.error('❌ Error categorizing lowers/uppers:', error);
    process.exit(1);
  }
}

// Run the categorization
categorizeAllLowersUppers();