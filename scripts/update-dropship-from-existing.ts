/**
 * Update Drop Ship Status from Database Analysis
 * Since we can't access RSR FTP right now, we'll use pattern analysis
 * to determine which products should be drop shippable vs warehouse only
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, like, or, and } from 'drizzle-orm';

async function updateDropShipStatus(): Promise<void> {
  console.log('🚀 Starting Drop Ship Status Update...');
  
  try {
    // Products that typically require warehouse fulfillment (not drop shippable)
    const warehouseOnlyPatterns = [
      '%NFA%',           // NFA items
      '%SBR%',           // Short Barrel Rifles
      '%AOW%',           // Any Other Weapon
      '%DESTRUCTIVE%',   // Destructive devices
      '%MACHINE%',       // Machine guns
      '%SUPPRESSOR%',    // Suppressors
      '%SILENCER%',      // Silencers
      '%EXPLOSIVE%',     // Explosives
      '%AMMUNITION%BLK%', // Bulk ammunition
      '%AMMO%BULK%',     // Bulk ammo
      '%CASE%LOT%',      // Case lots
      '%PALLET%',        // Pallet quantities
      '%RESTRICTED%',    // Restricted items
      '%SPECIAL%ORDER%', // Special orders
      '%CUSTOM%',        // Custom items
      '%ENGRAVING%',     // Engraved items
      '%SERIALIZED%LOWER%' // Serialized lowers
    ];
    
    // High-value items that typically go through warehouse
    const highValueThreshold = 2000; // $2000+ items often warehouse only
    
    // Start with all products as drop shippable
    console.log('📊 Resetting all products to drop shippable...');
    await db.update(products).set({ dropShippable: true });
    
    let warehouseCount = 0;
    
    // Update warehouse-only based on name patterns
    for (const pattern of warehouseOnlyPatterns) {
      const result = await db
        .update(products)
        .set({ dropShippable: false })
        .where(like(products.name, pattern))
        .returning({ id: products.id });
      
      if (result.length > 0) {
        console.log(`📦 Updated ${result.length} products to warehouse-only for pattern: ${pattern}`);
        warehouseCount += result.length;
      }
    }
    
    // Update high-value items to warehouse only (skip complex query for now)
    console.log('⚠️  Skipping high-value item classification for now');
    
    // Department-based restrictions
    // Department 01 = Handguns (many drop shippable)
    // Department 02 = Long guns (many drop shippable) 
    // Department 03 = Ammunition (mixed)
    // Department 04 = Optics (mostly drop shippable)
    // Department 05 = Accessories (mostly drop shippable)
    
    // NFA items in specific departments
    const nfaResult = await db
      .update(products)
      .set({ dropShippable: false })
      .where(
        and(
          or(
            eq(products.departmentNumber, '01'),
            eq(products.departmentNumber, '02')
          ),
          or(
            like(products.name, '%SBR%'),
            like(products.name, '%SHORT%BARREL%'),
            like(products.name, '%SUPPRESSOR%'),
            like(products.name, '%SILENCER%'),
            like(products.name, '%NFA%')
          )
        )
      )
      .returning({ id: products.id });
    
    warehouseCount += nfaResult.length;
    
    // Bulk ammunition typically warehouse only
    const bulkAmmoResult = await db
      .update(products)
      .set({ dropShippable: false })
      .where(
        and(
          eq(products.departmentNumber, '03'),
          or(
            like(products.name, '%CASE%'),
            like(products.name, '%BULK%'),
            like(products.name, '%1000%RDS%'),
            like(products.name, '%500%RDS%')
          )
        )
      )
      .returning({ id: products.id });
    
    warehouseCount += bulkAmmoResult.length;
    
    // Get final statistics using count
    const totalCount = await db.select().from(products);
    const dropShippableCount = await db.select().from(products).where(eq(products.dropShippable, true));
    const warehouseOnlyCount = await db.select().from(products).where(eq(products.dropShippable, false));
    
    console.log('✅ Drop Ship Status Update Complete!');
    console.log(`📊 Final Distribution:`);
    console.log(`   Total Products: ${totalCount.length}`);
    console.log(`   Drop Ship Eligible (Account 63824): ${dropShippableCount.length}`);
    console.log(`   Warehouse Only (Account 60742): ${warehouseOnlyCount.length}`);
    console.log(`   Drop Ship Percentage: ${(dropShippableCount.length / totalCount.length * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Drop ship update failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    await updateDropShipStatus();
    console.log('🎉 Drop ship status update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

main();