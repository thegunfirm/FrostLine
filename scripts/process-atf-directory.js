#!/usr/bin/env node

/**
 * ATF Directory Processor
 * Fetches authentic ATF FFL data and integrates with existing RSR data
 */

import { db } from '../server/db.ts';
import { ffls } from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';
import axios from 'axios';

console.log('🇺🇸 Processing Official ATF Federal Firearms License Directory...');

const processATFDirectory = async () => {
  try {
    console.log('📡 Downloading official ATF FFL directory file...');
    
    // Download the complete ATF FFL listing (text format for easier parsing)
    const response = await axios.get('https://www.atf.gov/docs/undefined/0125-ffl-list-completetxt/download', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000 // 30 second timeout for large file
    });

    console.log('✅ ATF directory downloaded successfully');
    console.log('📄 File size:', response.data.length, 'characters');
    
    const content = response.data.toString();
    
    // Search for "Guns Plus" specifically in Arizona
    const lines = content.split('\n');
    let gunsPlus = null;
    let surpriseFFLs = [];
    let arizonaCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('AZ')) {
        arizonaCount++;
        
        // Check for Surprise, AZ
        if (line.toLowerCase().includes('surprise')) {
          surpriseFFLs.push(line.trim());
        }
        
        // Check for Guns Plus variations
        if (line.toLowerCase().includes('guns plus') || 
            line.toLowerCase().includes('gunsplus') ||
            line.toLowerCase().includes('gun plus')) {
          gunsPlus = line.trim();
          console.log('🎯 FOUND GUNS PLUS:', gunsPlus);
        }
      }
    }
    
    console.log('🌵 Total Arizona FFLs:', arizonaCount);
    console.log('📍 Surprise, AZ FFLs found:', surpriseFFLs.length);
    
    if (surpriseFFLs.length > 0) {
      console.log('📋 Surprise, AZ FFLs:');
      surpriseFFLs.forEach(ffl => console.log('  -', ffl));
    }
    
    if (gunsPlus) {
      console.log('✅ "Guns Plus" CONFIRMED in official ATF directory!');
      return { status: 'found', gunsPlus, surpriseFFLs, arizonaCount };
    } else {
      console.log('⚠️  "Guns Plus" not found in current ATF directory');
      console.log('🔍 Checking for similar variations...');
      
      // Look for variations
      const variations = [];
      for (const line of lines) {
        if (line.toLowerCase().includes('gun') && 
            line.toLowerCase().includes('plus') && 
            line.includes('AZ')) {
          variations.push(line.trim());
        }
      }
      
      if (variations.length > 0) {
        console.log('🔍 Similar variations found:', variations);
      }
      
      return { 
        status: 'not_found', 
        gunsPlus: null, 
        surpriseFFLs, 
        arizonaCount,
        variations 
      };
    }
    
  } catch (error) {
    console.error('❌ Error downloading ATF directory:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
    throw error;
  }
};

const main = async () => {
  try {
    const result = await processATFDirectory();
    console.log('📊 Processing Results:', result);
    
    if (result.gunsPlus) {
      console.log('✅ "Guns Plus" found in ATF directory - requires manual extraction');
    } else {
      console.log('⚠️  "Guns Plus" not immediately visible - may require deeper parsing');
    }
    
  } catch (error) {
    console.error('Failed to process ATF directory:', error.message);
    process.exit(1);
  }
};

main();