#!/usr/bin/env node

/**
 * ATF-RSR Cross-Reference Setup Script
 * Updates existing RSR FFLs to mark them as "OnFile" and sets up status system
 */

import { db } from '../server/db.ts';
import { ffls } from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

console.log('🔗 Setting up ATF-RSR Cross-Reference System...');

const setupCrossReference = async () => {
  try {
    // Step 1: Mark all existing RSR FFLs as "OnFile" and set isRsrPartner flag
    console.log('📋 Step 1: Marking existing RSR FFLs as "OnFile"...');
    
    const updateResult = await db.update(ffls)
      .set({ 
        status: 'OnFile',
        isRsrPartner: true,
        isAtfActive: true,
        lastAtfUpdate: new Date()
      })
      .where(eq(ffls.isAvailableToUser, true));

    console.log('✅ Updated all existing RSR FFLs to "OnFile" status');

    // Step 2: Get current stats
    const stats = await db.select({
      total: sql`count(*)`.as('total'),
      onFile: sql`count(*) filter (where status = 'OnFile')`.as('onFile'),
      notOnFile: sql`count(*) filter (where status = 'NotOnFile')`.as('notOnFile'),
      preferred: sql`count(*) filter (where status = 'Preferred')`.as('preferred')
    }).from(ffls);

    console.log('');
    console.log('📊 Current FFL Status Summary:');
    console.log(`   Total FFLs: ${stats[0].total}`);
    console.log(`   On File (RSR): ${stats[0].onFile}`);
    console.log(`   Not On File: ${stats[0].notOnFile}`);
    console.log(`   Preferred: ${stats[0].preferred}`);
    console.log('');
    console.log('✅ ATF-RSR Cross-Reference System Ready!');
    console.log('');
    console.log('🎯 Status System:');
    console.log('   OnFile = FFL is in RSR partner network (can process RSR orders)');
    console.log('   NotOnFile = FFL exists in ATF directory but not RSR partner');
    console.log('   Preferred = Staff-marked FFLs (managed via CMS interface)');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('   1. Run ATF directory processing to add NotOnFile FFLs');
    console.log('   2. Use CMS interface to mark FFLs as Preferred');
    console.log('   3. FFL selector will prioritize: Preferred > OnFile > NotOnFile');

  } catch (error) {
    console.error('❌ Error setting up cross-reference:', error.message);
    process.exit(1);
  }
};

setupCrossReference();