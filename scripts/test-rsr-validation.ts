/**
 * Test RSR File Validation System
 * Demonstrates the validation and fix functionality
 */

import { rsrFileProcessor } from '../server/services/distributors/rsr/rsr-file-processor';

async function testRSRValidation() {
  console.log('🔍 Testing RSR File Validation System');
  console.log('====================================\n');

  try {
    const filePath = 'server/data/rsr/downloads/rsrinventory-new.txt';
    
    console.log('1. Running validation check...');
    const validation = await rsrFileProcessor.validateDatabaseIntegrity(filePath);
    
    if (validation.isValid) {
      console.log('✅ Database is perfectly aligned with RSR file');
      console.log('   No discrepancies found\n');
    } else {
      console.log(`❌ Found ${validation.discrepancies.length} discrepancies`);
      console.log('   Sample discrepancies:');
      validation.discrepancies.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.sku}: RSR=${item.rsrQuantity}, DB=${item.dbQuantity} (diff: ${item.difference})`);
      });
      
      console.log('\n2. Attempting to fix discrepancies...');
      const fixResult = await rsrFileProcessor.fixDatabaseDiscrepancies(filePath);
      console.log(`   Fixed: ${fixResult.fixed} products`);
      console.log(`   Errors: ${fixResult.errors} products`);
      
      console.log('\n3. Re-validating after fixes...');
      const revalidation = await rsrFileProcessor.validateDatabaseIntegrity(filePath);
      
      if (revalidation.isValid) {
        console.log('✅ All discrepancies fixed successfully');
      } else {
        console.log(`❌ Still have ${revalidation.discrepancies.length} discrepancies remaining`);
      }
    }
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRSRValidation().then(() => {
  console.log('\n✅ RSR validation test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});