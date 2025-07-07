/**
 * Show Glock Products Tagged as Accessories
 * Displays the 10 Glock products with "Accessories" tags in Handguns category
 */
import { db } from "../server/db.js";
import { products } from "../shared/schema.js";
import { and, eq, like } from "drizzle-orm";

async function showGlockAccessories() {
  console.log("🔍 Finding Glock products tagged as Accessories in Handguns category...\n");
  
  const glockProducts = await db
    .select({
      id: products.id,
      name: products.name,
      stockNo: products.stockNo,
      category: products.category,
      tags: products.tags,
      manufacturer: products.manufacturer
    })
    .from(products)
    .where(
      and(
        eq(products.category, "Handguns"),
        like(products.name, "%GLOCK%")
      )
    );

  // Filter for those with 'Accessories' in tags
  const accessoryTagged = glockProducts.filter(product => {
    if (!product.tags) return false;
    const tags = Array.isArray(product.tags) ? product.tags : [];
    return tags.some(tag => 
      typeof tag === "string" && tag.toLowerCase().includes("accessories")
    );
  });

  console.log(`📊 Found ${accessoryTagged.length} Glock products with 'Accessories' tags:\n`);
  
  accessoryTagged.forEach((product, index) => {
    console.log(`${index + 1}. Stock: ${product.stockNo}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   Manufacturer: ${product.manufacturer}`);
    console.log(`   Tags: ${JSON.stringify(product.tags)}`);
    console.log("");
  });
  
  process.exit(0);
}

showGlockAccessories().catch(console.error);