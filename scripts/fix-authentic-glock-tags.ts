/**
 * Fix Authentic Glock Tag Issues
 * Properly categorizes authentic RSR Glock products based on their actual product types
 */

import { db } from "../server/db";
import { products } from "@shared/schema";
import { eq, and, like, sql } from "drizzle-orm";

const BATCH_SIZE = 50;

/**
 * Determine if product is an actual handgun vs accessory/apparel
 */
function categorizeGlockProduct(name: string): { category: string; tags: string[] } {
  const productName = name.toLowerCase();
  
  // Check for actual handgun models
  if (
    (productName.includes('glock') && productName.includes('gen')) ||
    (productName.includes('glock') && /\d+l?\s/.test(productName)) || // Model numbers like 17, 19, etc.
    (productName.includes('glock') && productName.includes('mos')) ||
    (productName.includes('glock') && productName.includes('9mm')) ||
    (productName.includes('glock') && productName.includes('.40')) ||
    (productName.includes('glock') && productName.includes('.45'))
  ) {
    // This is an actual handgun
    const tags = ["Handguns", "GLOCK"];
    
    // Add generation if specified
    if (productName.includes('gen5') || productName.includes('gen 5')) {
      tags.push("Gen 5");
    } else if (productName.includes('gen4') || productName.includes('gen 4')) {
      tags.push("Gen 4");
    } else if (productName.includes('gen3') || productName.includes('gen 3')) {
      tags.push("Gen 3");
    }
    
    // Add caliber
    if (productName.includes('9mm')) {
      tags.push("9mm");
    } else if (productName.includes('.40')) {
      tags.push(".40 S&W");
    } else if (productName.includes('.45')) {
      tags.push(".45 ACP");
    }
    
    // Add special features
    if (productName.includes('mos')) {
      tags.push("MOS");
    }
    
    return { category: "Handguns", tags };
  }
  
  // Check for apparel/clothing
  if (
    productName.includes('shirt') ||
    productName.includes('sht') ||
    productName.includes('tee') ||
    productName.includes('hoodie') ||
    productName.includes('hat') ||
    productName.includes('cap')
  ) {
    return {
      category: "Accessories",
      tags: ["Accessories", "GLOCK", "Apparel"]
    };
  }
  
  // Check for knives and tools
  if (
    productName.includes('knife') ||
    productName.includes('fld knife') ||
    productName.includes('field knife')
  ) {
    return {
      category: "Accessories", 
      tags: ["Accessories", "GLOCK", "Knives", "Tools"]
    };
  }
  
  // Check for signs and promotional items
  if (
    productName.includes('sign') ||
    productName.includes('perfection') ||
    productName.includes('safe action')
  ) {
    return {
      category: "Accessories",
      tags: ["Accessories", "GLOCK", "Signs", "Promotional"]
    };
  }
  
  // Check for actual gun parts/components
  if (
    productName.includes('barrel') ||
    productName.includes('slide') ||
    productName.includes('trigger') ||
    productName.includes('magazine') ||
    productName.includes('sight') ||
    productName.includes('spring') ||
    productName.includes('pin') ||
    productName.includes('connector')
  ) {
    return {
      category: "Parts and Components",
      tags: ["Parts", "GLOCK", "Components"]
    };
  }
  
  // Default to accessories for any other Glock branded items
  return {
    category: "Accessories",
    tags: ["Accessories", "GLOCK"]
  };
}

/**
 * Fix authentic Glock product categorization
 */
async function fixAuthenticGlockTags() {
  console.log("🔧 Starting Authentic Glock Product Fix...");
  
  let totalProcessed = 0;
  let handgunsFixed = 0;
  let accessoriesMoved = 0;
  let apparelMoved = 0;
  let partsMoved = 0;
  
  while (true) {
    // Get remaining problematic products
    const problematicProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.category, "Handguns"),
          like(products.name, "%GLOCK%"),
          sql`tags::text LIKE '%Accessories%'`
        )
      )
      .limit(BATCH_SIZE);
    
    if (problematicProducts.length === 0) {
      console.log("✅ No more products to fix!");
      break;
    }
    
    console.log(`📊 Processing ${problematicProducts.length} products...`);
    
    for (const product of problematicProducts) {
      const { category, tags } = categorizeGlockProduct(product.name);
      
      await db
        .update(products)
        .set({
          category,
          tags: JSON.stringify(tags)
        })
        .where(eq(products.id, product.id));
      
      totalProcessed++;
      
      if (category === "Handguns") {
        handgunsFixed++;
        if (handgunsFixed <= 5) {
          console.log(`🔫 Handgun: ${product.name} -> ${tags.join(", ")}`);
        }
      } else if (category === "Accessories") {
        if (tags.includes("Apparel")) {
          apparelMoved++;
          if (apparelMoved <= 3) {
            console.log(`👕 Apparel: ${product.name} -> Accessories`);
          }
        } else {
          accessoriesMoved++;
          if (accessoriesMoved <= 3) {
            console.log(`🔧 Accessory: ${product.name} -> Accessories`);
          }
        }
      } else if (category === "Parts and Components") {
        partsMoved++;
        if (partsMoved <= 3) {
          console.log(`⚙️ Part: ${product.name} -> Parts and Components`);
        }
      }
    }
    
    if (problematicProducts.length < BATCH_SIZE) {
      break;
    }
  }
  
  console.log("\n🎉 AUTHENTIC GLOCK FIX COMPLETE:");
  console.log(`🔫 Handguns properly tagged: ${handgunsFixed}`);
  console.log(`👕 Apparel moved to Accessories: ${apparelMoved}`);
  console.log(`🔧 Accessories moved: ${accessoriesMoved}`);
  console.log(`⚙️ Parts moved to Components: ${partsMoved}`);
  console.log(`📊 Total products processed: ${totalProcessed}`);
  
  // Verify no remaining issues
  const remainingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(
      and(
        eq(products.category, "Handguns"),
        like(products.name, "%GLOCK%"),
        sql`tags::text LIKE '%Accessories%'`
      )
    );
  
  console.log(`🔍 Verification: ${remainingCount[0].count} products still need fixing`);
}

// Execute the fix
fixAuthenticGlockTags()
  .then(() => {
    console.log("✅ Authentic Glock fix completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Authentic Glock fix failed:", error);
    process.exit(1);
  });