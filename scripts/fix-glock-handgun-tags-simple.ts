/**
 * Fix Glock Handgun Tags - Simplified Version
 * Corrects systematic tagging error where all Glock handgun products 
 * were incorrectly tagged with "Accessories" instead of "Handguns"
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and, like } from "drizzle-orm";

/**
 * Fix Glock handgun tags across the entire database
 */
async function fixGlockHandgunTags() {
  console.log("🔧 Starting Glock Handgun Tag Fix...");
  
  try {
    // Get all Glock products in Handguns category
    const glockProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, "Handguns"),
          like(products.name, "%GLOCK%")
        )
      );
    
    console.log(`📊 Found ${glockProducts.length} Glock products in Handguns category`);
    
    if (glockProducts.length === 0) {
      console.log("✅ No Glock products found");
      return;
    }
    
    let fixedCount = 0;
    let accessoryCount = 0;
    
    for (const product of glockProducts) {
      // Check if the product has "Accessories" in its tags
      const tagsString = JSON.stringify(product.tags);
      const hasAccessoriesTag = tagsString.includes("Accessories");
      
      if (hasAccessoriesTag) {
        // Check if this is actually a handgun or accessory
        const productName = product.name.toLowerCase();
        const isAccessory = (
          productName.includes('barrel') ||
          productName.includes('slide') ||
          productName.includes('trigger') ||
          productName.includes('magazine') ||
          productName.includes('sight') ||
          productName.includes('grip') ||
          productName.includes('holster') ||
          productName.includes('mount') ||
          productName.includes('rail') ||
          productName.includes('spring') ||
          productName.includes('pin') ||
          productName.includes('kit') ||
          productName.includes('tool') ||
          productName.includes('adapter') ||
          productName.includes('connector')
        );
        
        if (isAccessory) {
          // Move to accessories category
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
        } else {
          // This is a genuine handgun - fix tags
          const correctTags = ["Handguns", "GLOCK"];
          
          // Add generation tag
          if (productName.includes('gen5') || productName.includes('gen 5')) {
            correctTags.push("Gen 5");
          } else if (productName.includes('gen4') || productName.includes('gen 4')) {
            correctTags.push("Gen 4");
          }
          
          // Add caliber
          if (productName.includes('9mm')) {
            correctTags.push("9mm");
          } else if (productName.includes('.40') || productName.includes('40sw')) {
            correctTags.push(".40 S&W");
          } else if (productName.includes('.45') || productName.includes('45acp')) {
            correctTags.push(".45 ACP");
          } else if (productName.includes('10mm')) {
            correctTags.push("10mm");
          }
          
          // Add size category
          if (productName.includes('compact')) {
            correctTags.push("Compact");
          } else if (productName.includes('subcompact')) {
            correctTags.push("Subcompact");
          } else {
            correctTags.push("Full Size");
          }
          
          // Add special features
          if (productName.includes('mos')) {
            correctTags.push("MOS");
          }
          
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
        }
      }
    }
    
    console.log("\n📋 Fix Summary:");
    console.log(`✅ Fixed handgun tags: ${fixedCount} products`);
    console.log(`🔄 Moved accessories: ${accessoryCount} products`);
    console.log(`📊 Total processed: ${fixedCount + accessoryCount} products`);
    
    if (fixedCount + accessoryCount === 0) {
      console.log("🎉 No Glock products had incorrect 'Accessories' tags!");
    } else {
      console.log("🎉 All Glock product tags have been successfully fixed!");
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