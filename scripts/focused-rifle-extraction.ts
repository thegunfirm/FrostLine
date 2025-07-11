/**
 * Focused Rifle Filter Extraction
 * Dramatically improves filter coverage for rifles using comprehensive pattern matching
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function focusedRifleExtraction() {
  try {
    console.log('🔍 Starting focused rifle filter extraction...');
    
    // Get all rifle products without current filter data
    const allRifles = await db.execute(sql`
      SELECT id, name, sku, department_number
      FROM products 
      WHERE department_number = '05'
      AND name IS NOT NULL
      ORDER BY id
    `);
    
    console.log(`📊 Found ${allRifles.rows.length} rifle products to analyze`);
    
    let processed = 0;
    let updated = 0;
    
    // Enhanced pattern matching for rifles
    const extractRifleFilters = (name: string) => {
      const filters = {
        barrelLength: null as string | null,
        finish: null as string | null,
        frameSize: null as string | null,
        actionType: null as string | null,
        sightType: null as string | null
      };
      
      // Barrel length patterns (more comprehensive for rifles)
      const barrelPatterns = [
        /(\d+(?:\.\d+)?)\s*["″'']/g,          // 16", 18", 20", 24", 26", 28"
        /(\d+(?:\.\d+)?)\s*inch/gi,           // 16 inch, 18 inch, 20 inch
        /(\d+(?:\.\d+)?)\s*in\b/gi,           // 16 in, 18 in, 20 in
        /(\d+(?:\.\d+)?)\s*-?\s*inch/gi,      // 16-inch, 18-inch, 20-inch
        /\b(\d+(?:\.\d+)?)\s*"\s*(?:barrel|bbl)/gi,   // 16" barrel, 18" bbl
        /(?:barrel|bbl)\s*(\d+(?:\.\d+)?)\s*"/gi,     // barrel 16", bbl 18"
        /(\d+(?:\.\d+)?)\s*"?\s*(?:barrel|bbl)/gi,       // 16 barrel, 18 bbl
      ];
      
      for (const pattern of barrelPatterns) {
        const matches = Array.from(name.matchAll(pattern));
        if (matches.length > 0) {
          for (const match of matches) {
            const length = parseFloat(match[1]);
            if (length >= 10 && length <= 50) { // Rifle barrel length range
              filters.barrelLength = `${length}"`;
              break;
            }
          }
        }
        if (filters.barrelLength) break;
      }
      
      // Finish patterns (comprehensive for rifles)
      const finishPatterns = [
        { pattern: /\b(?:black|blk|matte black|matt black|flat black|anodized black)\b/gi, value: 'Black' },
        { pattern: /\b(?:stainless|ss|stainless steel|stnls|stainless finish)\b/gi, value: 'Stainless Steel' },
        { pattern: /\b(?:od green|odg|olive drab|olive green|olive)\b/gi, value: 'OD Green' },
        { pattern: /\b(?:fde|flat dark earth|dark earth|earth|desert)\b/gi, value: 'FDE' },
        { pattern: /\b(?:bronze|burnt bronze|brz|bronze finish)\b/gi, value: 'Bronze' },
        { pattern: /\b(?:tungsten|gray|grey|gunmetal|titanium)\b/gi, value: 'Gray' },
        { pattern: /\b(?:tan|desert tan|sand|coyote tan|khaki)\b/gi, value: 'Tan' },
        { pattern: /\b(?:coyote|coyote brown|coy|brown)\b/gi, value: 'Coyote' },
        { pattern: /\b(?:blue|blued|royal blue|navy)\b/gi, value: 'Blue' },
        { pattern: /\b(?:nickel|nickel plated|nkl|chrome|chromed)\b/gi, value: 'Nickel' },
        { pattern: /\b(?:cerakote|cerakoted|cera|ceramic)\b/gi, value: 'Cerakote' },
        { pattern: /\b(?:anodized|hard anodized|ano|type iii)\b/gi, value: 'Anodized' },
        { pattern: /\b(?:parkerized|parkerizing|park)\b/gi, value: 'Parkerized' },
        { pattern: /\b(?:camouflage|camo|woodland|multicam|realtree|hunting camo)\b/gi, value: 'Camouflage' },
        { pattern: /\b(?:white|wht|arctic white)\b/gi, value: 'White' },
        { pattern: /\b(?:red|crimson|cardinal)\b/gi, value: 'Red' },
        { pattern: /\b(?:green|grn|forest green)\b/gi, value: 'Green' },
        { pattern: /\b(?:carbon fiber|carbon|cf|carbon black)\b/gi, value: 'Carbon Fiber' },
        { pattern: /\b(?:polymer|poly|synthetic)\b/gi, value: 'Polymer' },
        { pattern: /\b(?:wood|wooden|walnut|maple|hardwood)\b/gi, value: 'Wood' },
        { pattern: /\b(?:aluminum|alloy|al|billet)\b/gi, value: 'Aluminum' },
      ];
      
      for (const { pattern, value } of finishPatterns) {
        if (pattern.test(name)) {
          filters.finish = value;
          break;
        }
      }
      
      // Frame size patterns (rifle-specific)
      const frameSizePatterns = [
        { pattern: /\b(?:rifle|standard rifle|full rifle)\b/gi, value: 'Rifle' },
        { pattern: /\b(?:carbine|carb|compact rifle)\b/gi, value: 'Carbine' },
        { pattern: /\b(?:sbr|short barrel rifle|short-barrel rifle)\b/gi, value: 'SBR' },
        { pattern: /\b(?:pistol|ar pistol|rifle pistol)\b/gi, value: 'Pistol' },
        { pattern: /\b(?:tactical|tac|operator|combat)\b/gi, value: 'Tactical' },
        { pattern: /\b(?:precision|prec|target|match|competition)\b/gi, value: 'Precision' },
        { pattern: /\b(?:hunting|hunt|field|sporting)\b/gi, value: 'Hunting' },
        { pattern: /\b(?:scout|patrol|recce)\b/gi, value: 'Scout' },
        { pattern: /\b(?:sniper|marksman|dmr|designated marksman)\b/gi, value: 'Sniper' },
        { pattern: /\b(?:bull barrel|heavy barrel|bull|heavy profile)\b/gi, value: 'Bull Barrel' },
        { pattern: /\b(?:lightweight|light|pencil barrel|ultralight)\b/gi, value: 'Lightweight' },
        { pattern: /\b(?:standard|std|regular|basic)\b/gi, value: 'Standard' },
      ];
      
      for (const { pattern, value } of frameSizePatterns) {
        if (pattern.test(name)) {
          filters.frameSize = value;
          break;
        }
      }
      
      // Action type patterns (rifle-specific)
      const actionPatterns = [
        { pattern: /\b(?:semi-auto|semi auto|semiauto|sa|auto)\b/gi, value: 'Semi-Auto' },
        { pattern: /\b(?:bolt action|bolt-action|bolt|manual|straight bolt)\b/gi, value: 'Bolt Action' },
        { pattern: /\b(?:lever action|lever-action|lever|lever gun)\b/gi, value: 'Lever Action' },
        { pattern: /\b(?:pump action|pump-action|pump|slide action)\b/gi, value: 'Pump Action' },
        { pattern: /\b(?:single shot|single-shot|single|break action)\b/gi, value: 'Single Shot' },
        { pattern: /\b(?:gas operated|gas-operated|gas|direct impingement|di)\b/gi, value: 'Gas Operated' },
        { pattern: /\b(?:straight pull|straight-pull|blaser)\b/gi, value: 'Straight Pull' },
      ];
      
      for (const { pattern, value } of actionPatterns) {
        if (pattern.test(name)) {
          filters.actionType = value;
          break;
        }
      }
      
      // Sight type patterns (rifle-specific)
      const sightPatterns = [
        { pattern: /\b(?:iron sights|iron sight|irons|metallic sights)\b/gi, value: 'Iron Sights' },
        { pattern: /\b(?:scope|scoped|optic|riflescope)\b/gi, value: 'Scope' },
        { pattern: /\b(?:red dot|rds|red-dot|dot sight)\b/gi, value: 'Red Dot' },
        { pattern: /\b(?:open sights|open sight|open|notch)\b/gi, value: 'Open Sights' },
        { pattern: /\b(?:peep sight|peep|aperture|ghost ring)\b/gi, value: 'Peep Sight' },
        { pattern: /\b(?:fiber optic|fiber optics|fo|fiber)\b/gi, value: 'Fiber Optic' },
        { pattern: /\b(?:adjustable|adj|windage|elevation)\b/gi, value: 'Adjustable' },
        { pattern: /\b(?:fixed|fixed sight|non-adjustable)\b/gi, value: 'Fixed' },
        { pattern: /\b(?:flip up|flip-up|folding|buis|backup)\b/gi, value: 'Flip Up' },
        { pattern: /\b(?:no sights|no sight|bare|optics ready|ready)\b/gi, value: 'No Sights' },
        { pattern: /\b(?:picatinny|rail|weaver|scope base)\b/gi, value: 'Rail Mount' },
      ];
      
      for (const { pattern, value } of sightPatterns) {
        if (pattern.test(name)) {
          filters.sightType = value;
          break;
        }
      }
      
      return filters;
    };
    
    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < allRifles.rows.length; i += batchSize) {
      const batch = allRifles.rows.slice(i, i + batchSize);
      
      for (const rifle of batch) {
        const filters = extractRifleFilters(rifle.name);
        
        // Update if we extracted any filter data
        if (filters.barrelLength || filters.finish || filters.frameSize || filters.actionType || filters.sightType) {
          await db.execute(sql`
            UPDATE products 
            SET 
              barrel_length = ${filters.barrelLength},
              finish = ${filters.finish},
              frame_size = ${filters.frameSize},
              action_type = ${filters.actionType},
              sight_type = ${filters.sightType}
            WHERE id = ${rifle.id}
          `);
          updated++;
        }
        
        processed++;
        
        if (processed % 200 === 0) {
          console.log(`   ✅ Processed ${processed}/${allRifles.rows.length} rifles (${updated} updated)`);
        }
      }
    }
    
    console.log(`\n🎉 Focused rifle extraction completed:`);
    console.log(`   - Processed: ${processed} rifles`);
    console.log(`   - Updated: ${updated} rifles with filter data`);
    
    // Show improvement statistics
    const finalStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(barrel_length) as with_barrel_length,
        COUNT(finish) as with_finish,
        COUNT(frame_size) as with_frame_size,
        COUNT(action_type) as with_action_type,
        COUNT(sight_type) as with_sight_type
      FROM products 
      WHERE department_number = '05'
    `);
    
    const stats = finalStats.rows[0];
    console.log(`\n📈 Final rifle filter coverage:`);
    console.log(`   - Total rifles: ${stats.total}`);
    console.log(`   - Barrel Length: ${stats.with_barrel_length} (${(stats.with_barrel_length/stats.total*100).toFixed(1)}%)`);
    console.log(`   - Finish: ${stats.with_finish} (${(stats.with_finish/stats.total*100).toFixed(1)}%)`);
    console.log(`   - Frame Size: ${stats.with_frame_size} (${(stats.with_frame_size/stats.total*100).toFixed(1)}%)`);
    console.log(`   - Action Type: ${stats.with_action_type} (${(stats.with_action_type/stats.total*100).toFixed(1)}%)`);
    console.log(`   - Sight Type: ${stats.with_sight_type} (${(stats.with_sight_type/stats.total*100).toFixed(1)}%)`);
    
  } catch (error: any) {
    console.error('❌ Error during focused rifle extraction:', error);
    throw error;
  }
}

// Run the extraction
focusedRifleExtraction().catch(console.error);