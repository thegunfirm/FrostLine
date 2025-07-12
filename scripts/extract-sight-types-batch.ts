/**
 * Extract Sight Types for Rifles and Shotguns - Batch Processing
 * Efficient batch processing for sight type extraction
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

async function extractSightTypesBatch() {
  console.log('🔍 Starting batch sight type extraction...');
  
  const sightTypePatterns = [
    // Iron sights
    { pattern: /\b(iron\s*sight|iron\s*sights|fixed\s*sight|fixed\s*sights)\b/i, type: 'Iron Sights' },
    { pattern: /\b(flip\s*up|flip\s*sight|flip\s*up\s*sight)\b/i, type: 'Flip-Up Sights' },
    { pattern: /\b(front\s*sight|rear\s*sight|front\s*post|rear\s*post)\b/i, type: 'Iron Sights' },
    
    // Optics ready
    { pattern: /\b(optics\s*ready|optic\s*ready|rail\s*ready|pic\s*rail)\b/i, type: 'Optics Ready' },
    { pattern: /\b(picatinny|weaver|mlok|m-lok|keymod)\b/i, type: 'Optics Ready' },
    { pattern: /\b(scope\s*ready|scope\s*mount|scope\s*base)\b/i, type: 'Optics Ready' },
    
    // Fiber optic
    { pattern: /\b(fiber\s*optic|fibre\s*optic|fiber\s*sight)\b/i, type: 'Fiber Optic' },
    { pattern: /\b(hi-viz|hiviz|fiber\s*optic\s*sight)\b/i, type: 'Fiber Optic' },
    
    // Ghost ring
    { pattern: /\b(ghost\s*ring|ghost\s*sight|peep\s*sight)\b/i, type: 'Ghost Ring' },
    
    // Adjustable sights
    { pattern: /\b(adjustable\s*sight|adj\s*sight|adjustable\s*rear)\b/i, type: 'Adjustable Sights' },
    { pattern: /\b(target\s*sight|match\s*sight|competition\s*sight)\b/i, type: 'Adjustable Sights' },
    
    // Red dot ready
    { pattern: /\b(red\s*dot|red\s*dot\s*ready|micro\s*dot)\b/i, type: 'Red Dot Ready' },
    { pattern: /\b(reflex\s*sight|reflex\s*ready|1x\s*optic)\b/i, type: 'Red Dot Ready' },
    
    // Tritium/Night sights
    { pattern: /\b(tritium|night\s*sight|glow\s*sight|luminous)\b/i, type: 'Night Sights' },
    { pattern: /\b(3\s*dot|three\s*dot|trijicon|meprolight)\b/i, type: 'Night Sights' },
    
    // No sights
    { pattern: /\b(no\s*sight|without\s*sight|bare\s*barrel|no\s*iron)\b/i, type: 'No Sights' },
    { pattern: /\b(drilled\s*tapped|d&t|scope\s*only)\b/i, type: 'No Sights' },
    
    // Bead sight (common on shotguns)
    { pattern: /\b(bead\s*sight|brass\s*bead|fiber\s*bead|front\s*bead)\b/i, type: 'Bead Sight' },
    
    // Rifle sights
    { pattern: /\b(rifle\s*sight|military\s*sight|a2\s*sight|a4\s*sight)\b/i, type: 'Rifle Sights' },
    { pattern: /\b(backup\s*sight|buis|back\s*up\s*iron)\b/i, type: 'Backup Sights' },
    
    // Scope specific
    { pattern: /\b(scope\s*included|w\/\s*scope|with\s*scope)\b/i, type: 'Scope Included' },
    { pattern: /\b(variable\s*scope|fixed\s*scope|hunting\s*scope)\b/i, type: 'Scope Included' }
  ];
  
  // Build SQL CASE statement for batch update
  const caseStatements = sightTypePatterns.map(({ pattern, type }) => {
    // Convert regex to SQL pattern
    const sqlPattern = pattern.source
      .replace(/\\b/g, '') // Remove word boundaries
      .replace(/\(\?\:|\)/g, '') // Remove non-capturing groups
      .replace(/\|/g, '|') // Keep OR operators
      .replace(/\s\*/g, ' *') // Keep space patterns
      .replace(/\\\s/g, '\\s') // Keep escaped spaces
      .replace(/\\\//g, '/') // Keep escaped slashes
      .toLowerCase();
    
    return `WHEN LOWER(name) ~ '${sqlPattern}' THEN '${type}'`;
  }).join(' ');
  
  const updateQuery = `
    UPDATE products 
    SET sight_type = CASE 
      ${caseStatements}
      ELSE sight_type 
    END
    WHERE department_number = '05' 
    AND (sight_type IS NULL OR sight_type = '')
  `;
  
  try {
    console.log('📊 Executing batch sight type extraction...');
    await db.execute(updateQuery);
    console.log('✅ Batch update completed');
    
    // Get statistics
    const stats = await db.execute(`
      SELECT 
        COUNT(*) as total_long_guns,
        COUNT(CASE WHEN sight_type IS NOT NULL AND sight_type != '' THEN 1 END) as with_sight_type,
        ROUND(COUNT(CASE WHEN sight_type IS NOT NULL AND sight_type != '' THEN 1 END) * 100.0 / COUNT(*), 1) as coverage_percent
      FROM products 
      WHERE department_number = '05'
    `);
    
    console.log('📊 Final statistics:', stats.rows[0]);
    
    // Show sight type breakdown
    const breakdown = await db.execute(`
      SELECT 
        sight_type,
        COUNT(*) as count
      FROM products 
      WHERE department_number = '05' 
      AND sight_type IS NOT NULL 
      AND sight_type != ''
      GROUP BY sight_type
      ORDER BY count DESC
    `);
    
    console.log('📊 Sight type breakdown:');
    breakdown.rows.forEach(row => {
      console.log(`  ${row.sight_type}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error in batch update:', error);
    throw error;
  }
}

// Run the extraction
extractSightTypesBatch()
  .then(() => {
    console.log('✅ Batch sight type extraction completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Batch sight type extraction failed:', error);
    process.exit(1);
  });

export { extractSightTypesBatch };