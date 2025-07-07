/**
 * Update Category Ribbons - Fix Category Names
 * Updates category ribbon names as requested:
 * - "Optics & Scopes" → "Optics"
 * - "Parts and Components" → "Parts"
 * - "Safety and Storage" → "NFA"
 */

import { db } from "../server/db";
import { categoryRibbons } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Update category ribbons with new names
 */
async function updateCategoryRibbons() {
  try {
    console.log("🔄 Starting category ribbon updates...");

    // First, let's see what ribbons currently exist
    const existingRibbons = await db.select().from(categoryRibbons).orderBy(categoryRibbons.displayOrder);
    
    console.log("📋 Current category ribbons:");
    existingRibbons.forEach(ribbon => {
      console.log(`  - ${ribbon.categoryName}: "${ribbon.ribbonText}" (Order: ${ribbon.displayOrder}, Active: ${ribbon.isActive})`);
    });

    // Update "Optics & Scopes" to "Optics"
    const opticsRibbon = existingRibbons.find(r => r.categoryName === "Optics & Scopes" || r.ribbonText.includes("Optics"));
    if (opticsRibbon) {
      await db.update(categoryRibbons)
        .set({ 
          categoryName: "Optics",
          ribbonText: "Optics"
        })
        .where(eq(categoryRibbons.id, opticsRibbon.id));
      console.log("✅ Updated 'Optics & Scopes' → 'Optics'");
    } else {
      // Create new Optics ribbon if none exists
      await db.insert(categoryRibbons).values({
        categoryName: "Optics",
        ribbonText: "Optics",
        displayOrder: 5,
        isActive: true
      });
      console.log("✅ Created new 'Optics' ribbon");
    }

    // Update "Parts and Components" to "Parts"
    const partsRibbon = existingRibbons.find(r => r.categoryName === "Parts and Components" || r.ribbonText.includes("Parts"));
    if (partsRibbon) {
      await db.update(categoryRibbons)
        .set({ 
          categoryName: "Parts",
          ribbonText: "Parts"
        })
        .where(eq(categoryRibbons.id, partsRibbon.id));
      console.log("✅ Updated 'Parts and Components' → 'Parts'");
    } else {
      // Create new Parts ribbon if none exists
      await db.insert(categoryRibbons).values({
        categoryName: "Parts",
        ribbonText: "Parts",
        displayOrder: 6,
        isActive: true
      });
      console.log("✅ Created new 'Parts' ribbon");
    }

    // Update "Safety and Storage" to "NFA"
    const safetyRibbon = existingRibbons.find(r => r.categoryName === "Safety and Storage" || r.ribbonText.includes("Safety"));
    if (safetyRibbon) {
      await db.update(categoryRibbons)
        .set({ 
          categoryName: "NFA",
          ribbonText: "NFA"
        })
        .where(eq(categoryRibbons.id, safetyRibbon.id));
      console.log("✅ Updated 'Safety and Storage' → 'NFA'");
    } else {
      // Create new NFA ribbon if none exists
      await db.insert(categoryRibbons).values({
        categoryName: "NFA",
        ribbonText: "NFA",
        displayOrder: 7,
        isActive: true
      });
      console.log("✅ Created new 'NFA' ribbon");
    }

    // Ensure we have all the core categories with proper order
    const coreCategories = [
      { categoryName: "Handguns", ribbonText: "Handguns", displayOrder: 1 },
      { categoryName: "Rifles", ribbonText: "Rifles", displayOrder: 2 },
      { categoryName: "Shotguns", ribbonText: "Shotguns", displayOrder: 3 },
      { categoryName: "Ammunition", ribbonText: "Ammunition", displayOrder: 4 },
      { categoryName: "Optics", ribbonText: "Optics", displayOrder: 5 },
      { categoryName: "Parts", ribbonText: "Parts", displayOrder: 6 },
      { categoryName: "NFA", ribbonText: "NFA", displayOrder: 7 },
      { categoryName: "Accessories", ribbonText: "Accessories", displayOrder: 8 }
    ];

    for (const category of coreCategories) {
      const existing = await db.select()
        .from(categoryRibbons)
        .where(eq(categoryRibbons.categoryName, category.categoryName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(categoryRibbons).values({
          categoryName: category.categoryName,
          ribbonText: category.ribbonText,
          displayOrder: category.displayOrder,
          isActive: true
        });
        console.log(`✅ Created missing '${category.categoryName}' ribbon`);
      } else {
        // Update display order if needed
        if (existing[0].displayOrder !== category.displayOrder) {
          await db.update(categoryRibbons)
            .set({ displayOrder: category.displayOrder })
            .where(eq(categoryRibbons.id, existing[0].id));
          console.log(`✅ Updated display order for '${category.categoryName}' to ${category.displayOrder}`);
        }
      }
    }

    // Show final results
    const updatedRibbons = await db.select().from(categoryRibbons).orderBy(categoryRibbons.displayOrder);
    
    console.log("\n🎯 Final category ribbons:");
    updatedRibbons.forEach(ribbon => {
      console.log(`  ${ribbon.displayOrder}. ${ribbon.categoryName}: "${ribbon.ribbonText}" (Active: ${ribbon.isActive})`);
    });

    console.log("\n✅ Category ribbon updates completed successfully!");
    console.log("🔄 Frontend will automatically refresh and show the new category names");

  } catch (error) {
    console.error("❌ Error updating category ribbons:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the update
updateCategoryRibbons().catch(console.error);