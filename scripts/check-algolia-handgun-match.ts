/**
 * Check if handgun SKUs from database match Algolia objectIDs
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkAlgoliaHandgunMatch() {
  // Get handgun SKUs from database
  const handguns = await db.select()
    .from(products)
    .where(eq(products.category, 'Handguns'))
    .limit(5);
  
  console.log('Database handgun SKUs:', handguns.map(p => p.sku));
  
  // Check if these SKUs exist in Algolia
  for (const handgun of handguns) {
    const response = await fetch(`https://${process.env.ALGOLIA_APP_ID!}-dsn.algolia.net/1/indexes/products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-API-Key': process.env.ALGOLIA_API_KEY!,
        'X-Algolia-Application-Id': process.env.ALGOLIA_APP_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: handgun.sku,
        hitsPerPage: 1
      })
    });
    
    const result = await response.json();
    console.log(`SKU ${handgun.sku}: ${result.hits.length > 0 ? 'EXISTS' : 'NOT FOUND'} in Algolia`);
    
    if (result.hits.length > 0) {
      console.log(`  -> Category: ${result.hits[0].category}, DeptNum: ${result.hits[0].departmentNumber}`);
    }
  }
}

checkAlgoliaHandgunMatch().catch(console.error);