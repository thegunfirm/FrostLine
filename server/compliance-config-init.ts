import { db } from './db';
import { firearmsComplianceSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Initialize default firearms compliance configuration from environment or defaults
 */
async function initializeComplianceConfig() {
  console.log('🔧 Initializing Firearms Compliance Configuration...');

  try {
    // Check if active config already exists
    const existingConfig = await db.select()
      .from(firearmsComplianceSettings)
      .where(eq(firearmsComplianceSettings.isActive, true))
      .limit(1);

    if (existingConfig.length > 0) {
      console.log('✅ Active compliance configuration found, skipping initialization');
      return;
    }

    // Get configuration from environment variables or use defaults
    const policyFirearmWindowDays = parseInt(process.env.POLICY_FIREARM_WINDOW_DAYS || '30');
    const policyFirearmLimit = parseInt(process.env.POLICY_FIREARM_LIMIT || '5');
    const featureMultiFirearmHold = process.env.FEATURE_MULTI_FIREARM_HOLD === '1' || process.env.FEATURE_MULTI_FIREARM_HOLD === 'true';
    const featureFflHold = process.env.FEATURE_FFL_HOLD === '1' || process.env.FEATURE_FFL_HOLD === 'true';

    // Create initial configuration
    await db.insert(firearmsComplianceSettings).values({
      policyFirearmWindowDays,
      policyFirearmLimit,
      featureMultiFirearmHold,
      featureFflHold,
      isActive: true,
      lastModifiedBy: null, // System initialization
    });

    console.log('✅ Firearms Compliance Configuration initialized with:');
    console.log(`   • Policy Window: ${policyFirearmWindowDays} days`);
    console.log(`   • Policy Limit: ${policyFirearmLimit} firearms`);
    console.log(`   • Multi-Firearm Hold: ${featureMultiFirearmHold ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   • FFL Hold: ${featureFflHold ? 'ENABLED' : 'DISABLED'}`);

  } catch (error) {
    console.error('❌ Failed to initialize compliance configuration:', error);
    // Don't throw error, allow server to start
  }
}

export { initializeComplianceConfig };