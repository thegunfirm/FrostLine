import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from './shared/schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function testAlgoliaMapping() {
  // Test the specific product from earlier
  const products = await db.select().from(schema.products).where(eq(schema.products.sku, '110G')).limit(1);
  const product = products[0];
  
  console.log('Testing field mapping for product 110G:');
  console.log('- product.sku:', product.sku);
  console.log('- product.rsrStockNumber:', product.rsrStockNumber);
  
  // Test a YHM product that should have different SKU vs RSR stock number
  const yhmProducts = await db.select().from(schema.products).where(eq(schema.products.sku, 'YHM-9670-C-1')).limit(1);
  if (yhmProducts.length > 0) {
    const yhmProduct = yhmProducts[0];
    console.log('\nTesting YHM-9670-C-1 product:');
    console.log('- product.sku:', yhmProduct.sku);
    console.log('- product.rsrStockNumber:', yhmProduct.rsrStockNumber);
  }
  
  await pool.end();
}

testAlgoliaMapping().catch(console.error);