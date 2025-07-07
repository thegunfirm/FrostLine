/**
 * Check Handgun Category Status
 * Quick check to see how many products remain in handguns vs accessories
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function checkHandgunStatus() {
  console.log('📊 Checking current handgun category status...');
  
  try {
    // Count products by category
    const categoryCounts = await db.select({
      category: products.category,
      count: sql<number>`count(*)`.as('count')
    })
    .from(products)
    .groupBy(products.category)
    .orderBy(sql`count(*) desc`);
    
    console.log('\n🔢 Products by Category:');
    categoryCounts.forEach(({ category, count }) => {
      console.log(`   ${category}: ${count} products`);
    });
    
    // Count products in Handguns with Accessories tags
    const handgunsWithAccessoryTags = await db.select()
      .from(products)
      .where(eq(products.category, 'Handguns'));
    
    let accessoriesInHandguns = 0;
    for (const product of handgunsWithAccessoryTags) {
      if (product.tags && Array.isArray(product.tags)) {
        const tags = product.tags.map((tag: any) => 
          typeof tag === 'string' ? tag.toLowerCase() : ''
        );
        if (tags.some(tag => tag.includes('accessories'))) {
          accessoriesInHandguns++;
        }
      }
    }
    
    console.log(`\n🎯 Status Summary:`);
    console.log(`   - Products in Handguns category: ${handgunsWithAccessoryTags.length}`);
    console.log(`   - Still have "Accessories" tags: ${accessoriesInHandguns}`);
    console.log(`   - Properly categorized handguns: ${handgunsWithAccessoryTags.length - accessoriesInHandguns}`);
    
    if (accessoriesInHandguns === 0) {
      console.log('\n✅ All accessories have been moved out of Handguns category!');
    } else {
      console.log(`\n⚠️  Still ${accessoriesInHandguns} accessories in Handguns category`);
    }
    
  } catch (error) {
    console.error('❌ Error checking handgun status:', error);
    throw error;
  }
}

// Run the check
checkHandgunStatus()
  .then(() => {
    console.log('✅ Handgun status check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Handgun status check failed:', error);
    process.exit(1);
  });