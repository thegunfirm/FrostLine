/**
 * Extract Handgun Capacity Information
 * Extracts magazine capacity from handgun product names and populates the capacity field
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Extract capacity from product name
 */
function extractCapacity(name: string): number | null {
  // Remove common prefixes and clean the name
  const cleanName = name.toUpperCase().replace(/\s+/g, ' ').trim();
  
  // Look for capacity patterns: "15RD", "17RD", "10+1", "8+1", "6RD", etc.
  const capacityPatterns = [
    /(\d+)\+1/,          // "15+1", "17+1" format
    /(\d+)RD/,           // "15RD", "17RD", "10RD" format
    /(\d+)\s*RD/,        // "15 RD", "17 RD" format
    /(\d+)\s*SHOT/,      // "6 SHOT" for revolvers
    /(\d+)\s*ROUND/,     // "15 ROUND" format
    /(\d+)\s*CAP/,       // "15 CAP" format
    /MAG\s*(\d+)/,       // "MAG 15" format
    /CAPACITY\s*(\d+)/,  // "CAPACITY 15" format
  ];

  for (const pattern of capacityPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const capacity = parseInt(match[1]);
      // Reasonable capacity range for handguns
      if (capacity >= 1 && capacity <= 50) {
        return capacity;
      }
    }
  }

  // Special cases for common revolver descriptions
  if (cleanName.includes('SINGLE ACTION') || cleanName.includes('REVOLVER')) {
    // Check for 6-shot revolvers (most common)
    if (cleanName.includes('6')) return 6;
    if (cleanName.includes('5')) return 5;
    if (cleanName.includes('8')) return 8;
  }

  return null;
}

/**
 * Extract and update handgun capacities
 */
async function extractHandgunCapacity() {
  try {
    console.log('🔍 Extracting handgun capacities...');
    
    // Get all handgun products
    const handguns = await db
      .select()
      .from(products)
      .where(eq(products.departmentNumber, '01'));

    console.log(`📊 Found ${handguns.length} handgun products`);

    let updatedCount = 0;
    const capacityStats: { [key: string]: number } = {};

    for (const handgun of handguns) {
      const capacity = extractCapacity(handgun.name);
      
      if (capacity) {
        // Update the product with capacity
        await db
          .update(products)
          .set({ capacity })
          .where(eq(products.id, handgun.id));
        
        updatedCount++;
        
        // Track capacity distribution
        const capKey = `${capacity}`;
        capacityStats[capKey] = (capacityStats[capKey] || 0) + 1;

        if (updatedCount % 100 === 0) {
          console.log(`✅ Updated ${updatedCount} products with capacity`);
        }
      }
    }

    console.log(`\n📈 Capacity extraction complete:`);
    console.log(`   • Total handguns: ${handguns.length}`);
    console.log(`   • Updated with capacity: ${updatedCount}`);
    console.log(`   • Success rate: ${((updatedCount / handguns.length) * 100).toFixed(1)}%`);

    console.log(`\n📊 Capacity distribution:`);
    Object.entries(capacityStats)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([capacity, count]) => {
        console.log(`   • ${capacity}-round: ${count} products`);
      });

  } catch (error) {
    console.error('❌ Error extracting handgun capacities:', error);
  }
}

// Run the extraction
extractHandgunCapacity().then(() => {
  console.log('✅ Handgun capacity extraction complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});