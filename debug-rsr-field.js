const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { products } = require('./shared/schema.ts');

async function debugRsrField() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  // Get one YHM product to see the exact field structure
  const product = await db.select().from(products).where({sku: 'YHM-3080-5C1'}).limit(1);
  
  if (product.length > 0) {
    console.log('Product object keys:', Object.keys(product[0]));
    console.log('RSR fields:');
    console.log('- sku:', product[0].sku);
    console.log('- rsr_stock_number:', product[0].rsr_stock_number);
    console.log('- rsrStockNumber:', product[0].rsrStockNumber);
    console.log('Full product:', JSON.stringify(product[0], null, 2).slice(0, 500));
  }
  
  await pool.end();
}

debugRsrField().catch(console.error);