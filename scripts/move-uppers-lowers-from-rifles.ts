#!/usr/bin/env tsx
/**
 * Move Uppers/Lowers from Rifles Category
 * Move receiver products from rifles to proper Uppers/Lowers category
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function moveUppersLowersFromRifles() {
  console.log('🔄 Moving uppers/lowers from rifles category...');
  
  try {
    // Get all products that should be moved
    const productsToMove = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, category, receiver_type, manufacturer
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%upper%' OR 
          LOWER(name) LIKE '%lower%' OR
          LOWER(name) LIKE '%receiver%'
        )
      ORDER BY name
    `);
    
    console.log(`📊 Found ${productsToMove.rows.length} products to move`);
    
    if (productsToMove.rows.length === 0) {
      console.log('✅ No products to move');
      return;
    }
    
    // Analyze and set receiver types
    const updates = productsToMove.rows.map(product => {
      let receiverType = 'Upper'; // Default
      const nameLower = product.name.toLowerCase();
      
      if (nameLower.includes('upper') && nameLower.includes('lower')) {
        receiverType = 'Upper'; // Upper/Lower sets counted as Upper
      } else if (nameLower.includes('lower')) {
        // Determine if it's handgun or rifle lower
        if (nameLower.includes('pistol') || nameLower.includes('handgun')) {
          receiverType = 'Handgun Lower';
        } else {
          receiverType = 'Rifle Lower';
        }
      } else if (nameLower.includes('upper')) {
        receiverType = 'Upper';
      } else if (nameLower.includes('receiver')) {
        // Check if it's a set or individual receiver
        if (nameLower.includes('set')) {
          receiverType = 'Upper'; // Receiver sets counted as Upper
        } else {
          receiverType = 'Rifle Lower'; // Individual receivers typically lowers
        }
      }
      
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        receiverType
      };
    });
    
    console.log('\n📊 RECEIVER TYPE CLASSIFICATION:');
    const typeCount = {};
    updates.forEach(u => {
      typeCount[u.receiverType] = (typeCount[u.receiverType] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Update products in batches
    console.log('\n🔄 Updating products...');
    for (const update of updates) {
      await db.execute(sql`
        UPDATE products 
        SET category = 'Uppers/Lowers', receiver_type = ${update.receiverType}
        WHERE id = ${update.id}
      `);
      console.log(`✅ Updated ${update.sku}: ${update.name} → ${update.receiverType}`);
    }
    
    // Verify the move
    console.log('\n🔍 Verifying move...');
    const remainingInRifles = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
        AND category = 'Rifles'
        AND (
          LOWER(name) LIKE '%upper%' OR 
          LOWER(name) LIKE '%lower%' OR
          LOWER(name) LIKE '%receiver%'
        )
    `);
    
    const totalUppersLowers = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM products 
      WHERE category = 'Uppers/Lowers'
    `);
    
    console.log(`Remaining uppers/lowers in rifles: ${remainingInRifles.rows[0].count}`);
    console.log(`Total Uppers/Lowers category: ${totalUppersLowers.rows[0].count}`);
    
    console.log('\n✅ Move complete');
    
  } catch (error) {
    console.error('❌ Error in move:', error);
  }
}

moveUppersLowersFromRifles();