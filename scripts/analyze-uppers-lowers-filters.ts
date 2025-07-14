#!/usr/bin/env tsx
/**
 * Analyze Uppers/Lowers Filter Coverage
 * Compare what filters were available before vs after categorization
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function analyzeUppersLowersFilters() {
  console.log('🔍 Analyzing Uppers/Lowers filter coverage...');
  
  try {
    // Get all Uppers/Lowers products
    const uppersLowersProducts = await db.execute(sql`
      SELECT 
        id, name, sku, department_number, manufacturer, category, receiver_type,
        caliber, capacity, barrel_length, finish, frame_size, action_type, sight_type,
        price_bronze, price_gold, price_platinum, stock_quantity, in_stock
      FROM products 
      WHERE category = 'Uppers/Lowers'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${uppersLowersProducts.rows.length} Uppers/Lowers products`);
    
    // Analyze receiver types
    const receiverTypes = {};
    uppersLowersProducts.rows.forEach(product => {
      const type = product.receiver_type || 'Unknown';
      receiverTypes[type] = (receiverTypes[type] || 0) + 1;
    });
    
    console.log('\n📊 Receiver Type Distribution:');
    Object.entries(receiverTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Analyze manufacturers
    const manufacturers = {};
    uppersLowersProducts.rows.forEach(product => {
      const mfg = product.manufacturer || 'Unknown';
      manufacturers[mfg] = (manufacturers[mfg] || 0) + 1;
    });
    
    console.log('\n📊 Manufacturer Distribution:');
    Object.entries(manufacturers)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([mfg, count]) => {
        console.log(`  ${mfg}: ${count}`);
      });
    
    // Analyze calibers
    const calibers = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.caliber) {
        calibers[product.caliber] = (calibers[product.caliber] || 0) + 1;
      }
    });
    
    console.log('\n📊 Caliber Distribution:');
    Object.entries(calibers)
      .sort(([,a], [,b]) => b - a)
      .forEach(([caliber, count]) => {
        console.log(`  ${caliber}: ${count}`);
      });
    
    // Analyze barrel lengths
    const barrelLengths = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.barrel_length) {
        barrelLengths[product.barrel_length] = (barrelLengths[product.barrel_length] || 0) + 1;
      }
    });
    
    console.log('\n📊 Barrel Length Distribution:');
    Object.entries(barrelLengths)
      .sort(([,a], [,b]) => b - a)
      .forEach(([length, count]) => {
        console.log(`  ${length}: ${count}`);
      });
    
    // Analyze finishes
    const finishes = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.finish) {
        finishes[product.finish] = (finishes[product.finish] || 0) + 1;
      }
    });
    
    console.log('\n📊 Finish Distribution:');
    Object.entries(finishes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([finish, count]) => {
        console.log(`  ${finish}: ${count}`);
      });
    
    // Analyze frame sizes
    const frameSizes = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.frame_size) {
        frameSizes[product.frame_size] = (frameSizes[product.frame_size] || 0) + 1;
      }
    });
    
    console.log('\n📊 Frame Size Distribution:');
    Object.entries(frameSizes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([size, count]) => {
        console.log(`  ${size}: ${count}`);
      });
    
    // Analyze action types
    const actionTypes = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.action_type) {
        actionTypes[product.action_type] = (actionTypes[product.action_type] || 0) + 1;
      }
    });
    
    console.log('\n📊 Action Type Distribution:');
    Object.entries(actionTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    
    // Analyze sight types
    const sightTypes = {};
    uppersLowersProducts.rows.forEach(product => {
      if (product.sight_type) {
        sightTypes[product.sight_type] = (sightTypes[product.sight_type] || 0) + 1;
      }
    });
    
    console.log('\n📊 Sight Type Distribution:');
    Object.entries(sightTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    
    // Stock analysis
    const stockAnalysis = {
      inStock: uppersLowersProducts.rows.filter(p => p.in_stock).length,
      outOfStock: uppersLowersProducts.rows.filter(p => !p.in_stock).length
    };
    
    console.log('\n📊 Stock Status Distribution:');
    console.log(`  In Stock: ${stockAnalysis.inStock}`);
    console.log(`  Out of Stock: ${stockAnalysis.outOfStock}`);
    
    // Department analysis
    const departments = {};
    uppersLowersProducts.rows.forEach(product => {
      const dept = product.department_number || 'Unknown';
      departments[dept] = (departments[dept] || 0) + 1;
    });
    
    console.log('\n📊 Department Distribution:');
    Object.entries(departments)
      .sort(([,a], [,b]) => b - a)
      .forEach(([dept, count]) => {
        console.log(`  Department ${dept}: ${count}`);
      });
    
    // Filter coverage summary
    console.log('\n📈 FILTER COVERAGE SUMMARY:');
    console.log(`Receiver Type: ${Object.keys(receiverTypes).length} types`);
    console.log(`Manufacturers: ${Object.keys(manufacturers).length} manufacturers`);
    console.log(`Calibers: ${Object.keys(calibers).length} calibers (${uppersLowersProducts.rows.filter(p => p.caliber).length}/${uppersLowersProducts.rows.length} products)`);
    console.log(`Barrel Lengths: ${Object.keys(barrelLengths).length} lengths (${uppersLowersProducts.rows.filter(p => p.barrel_length).length}/${uppersLowersProducts.rows.length} products)`);
    console.log(`Finishes: ${Object.keys(finishes).length} finishes (${uppersLowersProducts.rows.filter(p => p.finish).length}/${uppersLowersProducts.rows.length} products)`);
    console.log(`Frame Sizes: ${Object.keys(frameSizes).length} sizes (${uppersLowersProducts.rows.filter(p => p.frame_size).length}/${uppersLowersProducts.rows.length} products)`);
    console.log(`Action Types: ${Object.keys(actionTypes).length} types (${uppersLowersProducts.rows.filter(p => p.action_type).length}/${uppersLowersProducts.rows.length} products)`);
    console.log(`Sight Types: ${Object.keys(sightTypes).length} types (${uppersLowersProducts.rows.filter(p => p.sight_type).length}/${uppersLowersProducts.rows.length} products)`);
    
    console.log('\n✅ Analysis complete');
    
  } catch (error) {
    console.error('❌ Error in analysis:', error);
  }
}

analyzeUppersLowersFilters();