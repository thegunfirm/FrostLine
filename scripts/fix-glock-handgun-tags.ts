/**
 * Fix Glock Handgun Tags - Major Categorization Fix
 * Corrects systematic tagging error where all Glock handgun products 
 * were incorrectly tagged with "Accessories" instead of "Handguns"
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

/**
 * Identify genuine Glock handgun models (complete firearms)
 */
function isGenuineGlockHandgun(name: string): boolean {
  const productName = name.toLowerCase();
  
  // Clear handgun model patterns
  const handgunPatterns = [
    /glock\s+\d+/, // GLOCK followed by model number
    /gen\s*[45]/, // Gen 4 or Gen 5
    /\d+mm/, // caliber designation
    /\d+rd/, // round count
    /compact/, 
    /full.*size/,
    /subcompact/
  ];
  
  // Exclude obvious accessories/parts
  const accessoryPatterns = [
    /barrel/,
    /slide/,
    /trigger/,
    /magazine/,
    /sight/,
    /grip/,
    /holster/,
    /mount/,
    /rail/,
    /spring/,
    /pin/,
    /kit/,
    /tool/,
    /adapter/,
    /connector/
  ];
  
  // Check if it's an accessory
  for (const pattern of accessoryPatterns) {
    if (pattern.test(productName)) {
      return false;
    }
  }
  
  // Check if it matches handgun patterns
  return handgunPatterns.some(pattern => pattern.test(productName));
}

/**
 * Generate correct tags for Glock handgun products
 */
function generateHandgunTags(name: string): string[] {
  const tags = ["Handguns", "GLOCK"];
  
  const productName = name.toLowerCase();
  
  // Add generation tag
  if (productName.includes('gen5') || productName.includes('gen 5')) {
    tags.push("Gen 5");
  } else if (productName.includes('gen4') || productName.includes('gen 4')) {
    tags.push("Gen 4");
  }
  
  // Add caliber
  if (productName.includes('9mm')) {
    tags.push("9mm");
  } else if (productName.includes('.40') || productName.includes('40sw')) {
    tags.push(".40 S&W");
  } else if (productName.includes('.45') || productName.includes('45acp')) {
    tags.push(".45 ACP");
  } else if (productName.includes('10mm')) {
    tags.push("10mm");
  }
  
  // Add size category
  if (productName.includes('compact')) {
    tags.push("Compact");
  } else if (productName.includes('subcompact')) {
    tags.push("Subcompact");
  } else {
    tags.push("Full Size");
  }
  
  // Add special features
  if (productName.includes('mos')) {
    tags.push("MOS");
  }
  
  return tags;
}

/**
 * Fix Glock handgun tags across the entire database
 */
async function fixGlockHandgunTags() {
  console.log("🔧 Starting Glock Handgun Tag Fix...");
  
  try {
    // Get all Glock products in Handguns category with "Accessories" tags
    const glockProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, "Handguns"),
          like(products.name, "%GLOCK%"),
          like(products.tags::text, "%Accessories%")
        )
      );
    
    console.log(`📊 Found ${glockProducts.length} Glock products with incorrect "Accessories" tags`);
    
    if (glockProducts.length === 0) {
      console.log("✅ No Glock products found with incorrect tags");
      return;
    }
    
    let fixedCount = 0;
    let accessoryCount = 0;
    
    for (const product of glockProducts) {
      const isHandgun = isGenuineGlockHandgun(product.name);
      
      if (isHandgun) {
        // This is a genuine handgun - update tags
        const correctTags = generateHandgunTags(product.name);
        
        await db
          .update(products)
          .set({
            tags: JSON.stringify(correctTags)
          })
          .where(eq(products.id, product.id));
        
        fixedCount++;
        
        if (fixedCount <= 10) {
          console.log(`✅ Fixed: ${product.name} -> Tags: ${correctTags.join(", ")}`);
        } else if (fixedCount === 11) {
          console.log("   ... (additional fixes not shown)");
        }
      } else {
        // This is actually an accessory - move to proper category
        await db
          .update(products)
          .set({
            category: "Parts and Components",
            tags: JSON.stringify(["Parts", "GLOCK", "Accessories"])
          })
          .where(eq(products.id, product.id));
        
        accessoryCount++;
        
        if (accessoryCount <= 5) {
          console.log(`🔄 Moved to Parts: ${product.name}`);
        }
      }
    }
    
    console.log("\n📋 Fix Summary:");
    console.log(`✅ Fixed handgun tags: ${fixedCount} products`);
    console.log(`🔄 Moved accessories: ${accessoryCount} products`);
    console.log(`📊 Total processed: ${glockProducts.length} products`);
    
    // Verify results
    const remainingBadTags = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, "Handguns"),
          like(products.name, "%GLOCK%"),
          like(products.tags::text, "%Accessories%")
        )
      );
    
    console.log(`🔍 Verification: ${remainingBadTags.length} products still have incorrect tags`);
    
    if (remainingBadTags.length === 0) {
      console.log("🎉 All Glock handgun tags have been successfully fixed!");
    }
    
  } catch (error) {
    console.error("❌ Error fixing Glock handgun tags:", error);
    throw error;
  }
}

// Execute the fix
fixGlockHandgunTags()
  .then(() => {
    console.log("✅ Glock handgun tag fix completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Glock handgun tag fix failed:", error);
    process.exit(1);
  });