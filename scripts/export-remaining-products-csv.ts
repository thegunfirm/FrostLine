/**
 * Export remaining 5.10% products to CSV for download
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db.js';
import { products } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function exportRemainingProductsCSV() {
  console.log('📊 Exporting remaining products to CSV...');
  
  // Get all remaining products where SKU = RSR Stock Number
  const remainingProducts = await db.select()
    .from(products)
    .where(eq(products.sku, products.rsrStockNumber));
  
  console.log(`Found ${remainingProducts.length} products where manufacturer part = RSR stock number`);
  
  // Create CSV content
  const csvHeaders = [
    'ID',
    'SKU (Manufacturer Part)',
    'RSR Stock Number',
    'Product Name',
    'Manufacturer', 
    'Category',
    'Price',
    'Quantity',
    'Is Firearm',
    'Requires FFL'
  ];
  
  const csvRows = remainingProducts.map(product => [
    product.id,
    `"${product.sku}"`,
    `"${product.rsrStockNumber}"`,
    `"${product.name?.replace(/"/g, '""') || ''}"`,
    `"${product.manufacturer || ''}"`,
    `"${product.category || ''}"`,
    product.price || 0,
    product.quantity || 0,
    product.isFirearm ? 'Yes' : 'No',
    product.requiresFFL ? 'Yes' : 'No'
  ]);
  
  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');
  
  // Write to public directory for download
  const outputPath = path.join(process.cwd(), 'public', 'remaining-products-identical-codes.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  
  console.log(`✅ CSV exported to: ${outputPath}`);
  console.log(`📄 File contains ${remainingProducts.length} products`);
  console.log(`🔗 Download URL: /remaining-products-identical-codes.csv`);
  
  // Summary by manufacturer
  const manufacturerCounts = new Map<string, number>();
  remainingProducts.forEach(product => {
    const mfg = product.manufacturer || 'Unknown';
    manufacturerCounts.set(mfg, (manufacturerCounts.get(mfg) || 0) + 1);
  });
  
  console.log('\n📊 Breakdown by manufacturer:');
  const sortedMfgs = Array.from(manufacturerCounts.entries()).sort((a, b) => b[1] - a[1]);
  sortedMfgs.slice(0, 10).forEach(([mfg, count]) => {
    console.log(`   ${mfg}: ${count} products`);
  });
  
  if (sortedMfgs.length > 10) {
    console.log(`   ... and ${sortedMfgs.length - 10} more manufacturers`);
  }
}

exportRemainingProductsCSV().then(() => process.exit(0)).catch(console.error);