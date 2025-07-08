/**
 * Fix RSR Sync Corruption - Rebuild All Products with Correct Department Numbers
 * The current database has 25,833 products with empty department_number and wrong assignments
 * This script will properly parse the RSR file and fix all department assignments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';
import ws from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function fixRSRSyncCorruption() {
  console.log('🔧 Starting RSR sync corruption fix...');
  
  // Initialize database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { logger: false });
  
  try {
    // Read RSR file
    const rsrFilePath = path.join(__dirname, '../server/data/rsr/downloads/rsrinventory-new.txt');
    if (!fs.existsSync(rsrFilePath)) {
      throw new Error('RSR inventory file not found');
    }
    
    const rsrData = fs.readFileSync(rsrFilePath, 'utf-8');
    const lines = rsrData.split('\n').filter(line => line.trim());
    
    console.log(`📄 Processing ${lines.length} RSR products...`);
    
    let fixed = 0;
    let errors = 0;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Parse RSR line (semicolon-separated)
        const fields = line.split(';');
        if (fields.length < 15) continue;
        
        const stockNumber = fields[0];
        const productDescription = fields[2];
        const departmentNumber = fields[3]; // This is the critical field
        const fullMfgName = fields[10];
        
        // Find product in database by SKU
        const existingProduct = await db
          .select()
          .from(products)
          .where(eq(products.sku, stockNumber))
          .limit(1);
        
        if (existingProduct.length > 0) {
          const product = existingProduct[0];
          
          // Update department number if it's wrong
          if (product.departmentNumber !== departmentNumber) {
            await db
              .update(products)
              .set({ departmentNumber })
              .where(eq(products.id, product.id));
            
            console.log(`✅ Fixed ${stockNumber}: ${productDescription} (${product.departmentNumber} → ${departmentNumber})`);
            fixed++;
          }
        }
        
        // Progress update every 1000 products
        if (i % 1000 === 0) {
          console.log(`📊 Progress: ${i}/${lines.length} (${Math.round((i/lines.length)*100)}%)`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing line ${i + 1}: ${error.message}`);
        errors++;
      }
    }
    
    console.log('🎉 RSR sync corruption fix completed:');
    console.log(`  ✅ Products fixed: ${fixed}`);
    console.log(`  ❌ Errors: ${errors}`);
    
    // Verify the fix by checking key products
    console.log('\n🔍 Verification:');
    
    const skullHooker = await db
      .select()
      .from(products)
      .where(eq(products.sku, 'SKH-RTTH-ASSY-BRN'));
    
    if (skullHooker.length > 0) {
      console.log(`  🦌 SKULL HOOKER: Department ${skullHooker[0].departmentNumber} (should be 13)`);
    }
    
    // Count by department
    const departmentCounts = await db
      .select()
      .from(products);
    
    const counts = departmentCounts.reduce((acc, p) => {
      const dept = p.departmentNumber || 'EMPTY';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Department distribution:');
    Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`  - Department ${dept}: ${count} products`);
      });
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixRSRSyncCorruption()
  .then(() => {
    console.log('✅ RSR sync corruption fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RSR sync corruption fix failed:', error);
    process.exit(1);
  });