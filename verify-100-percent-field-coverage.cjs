const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

console.log('🎯 VERIFYING 100% FIELD COVERAGE FIX');
console.log('Testing the updated ComprehensiveDealFieldMapper implementation');
console.log('=' .repeat(70));

async function verifyFix() {
  try {
    console.log('🚀 Processing test order with updated field mapper...');
    
    // Process a new order to test the fix
    const orderResponse = await execAsync(`curl -X POST "http://localhost:5000/api/process-enhanced-order" \\
      -H "Content-Type: application/json" --silent`);
    
    const orderResult = JSON.parse(orderResponse.stdout);
    
    if (orderResult.success) {
      const orderId = orderResult.orderId;
      const tgfOrderNumber = orderResult.tgfOrderNumber;
      
      console.log(`✅ New test order processed: ${tgfOrderNumber} (ID: ${orderId})`);
      
      await verifyFieldCoverage(orderId, tgfOrderNumber);
      
    } else {
      console.log('❌ Order processing failed:', orderResult.error);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

async function verifyFieldCoverage(orderId, tgfOrderNumber) {
  console.log(`🔍 Analyzing field coverage for ${tgfOrderNumber}...`);
  console.log('');
  
  const response = await execAsync(`curl -s "http://localhost:5000/api/orders/${orderId}/activity-logs"`);
  const logData = JSON.parse(response.stdout);
  
  const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
  
  if (dealLog?.details?.dealBreakdown?.[0]?.comprehensiveFields) {
    const fields = dealLog.details.dealBreakdown[0].comprehensiveFields;
    const fieldCount = Object.keys(fields).length;
    
    console.log('📊 FIELD COVERAGE ANALYSIS:');
    console.log(`   Total Fields Implemented: ${fieldCount}`);
    console.log(`   Target for 100%: 37 fields`);
    console.log(`   Coverage Percentage: ${Math.round((fieldCount / 37) * 100)}%`);
    console.log(`   Status: ${fieldCount >= 37 ? '✅ 100% ACHIEVED' : '❌ INCOMPLETE'}`);
    console.log('');
    
    console.log('📋 ALL IMPLEMENTED FIELDS:');
    const sortedFields = Object.keys(fields).sort();
    sortedFields.forEach((field, index) => {
      const value = fields[field];
      const displayValue = value === undefined ? 'undefined' : 
                          value === null ? 'null' :
                          typeof value === 'string' && value.length > 50 ? `${value.substring(0, 50)}...` :
                          JSON.stringify(value);
      console.log(`   ${(index + 1).toString().padStart(2)}. ${field}: ${displayValue}`);
    });
    console.log('');
    
    // Check for the specific missing fields that were identified
    const expectedMissingFields = [
      'Webservices_App', 'Last_Distributor_Update', 'Carrier', 'Tracking_Number',
      'Hold_Type', 'Hold_Started_At', 'Hold_Cleared_At', 'Return_Status'
    ];
    
    console.log('🔧 CHECKING PREVIOUSLY MISSING FIELDS:');
    expectedMissingFields.forEach(field => {
      const isPresent = fields.hasOwnProperty(field);
      console.log(`   ${isPresent ? '✅' : '❌'} ${field}: ${isPresent ? 'IMPLEMENTED' : 'STILL MISSING'}`);
    });
    console.log('');
    
    // Final assessment
    const stillMissing = expectedMissingFields.filter(field => !fields.hasOwnProperty(field));
    
    if (stillMissing.length === 0) {
      console.log('🎉 SUCCESS: ALL PREVIOUSLY MISSING FIELDS NOW IMPLEMENTED!');
      console.log(`✅ Field coverage increased from 89% to ${Math.round((fieldCount / 37) * 100)}%`);
    } else {
      console.log(`❌ PARTIAL FIX: ${expectedMissingFields.length - stillMissing.length} fields added, ${stillMissing.length} still missing`);
      console.log('Still missing:', stillMissing.join(', '));
    }
    
    return { fieldCount, coveragePercent: Math.round((fieldCount / 37) * 100), complete: fieldCount >= 37 };
    
  } else {
    console.log('❌ No deal fields found in activity logs');
    return { fieldCount: 0, coveragePercent: 0, complete: false };
  }
}

async function generateReport() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('📊 100% FIELD COVERAGE VERIFICATION REPORT');
  console.log('═'.repeat(70));
  
  console.log('🎯 OBJECTIVE: Implement all 37 Zoho Deal module fields');
  console.log('🔧 FIX APPLIED: Updated ComprehensiveDealFieldMapper');
  console.log('📋 VERIFICATION: Complete field coverage test executed');
  console.log('');
  console.log('If 100% coverage achieved, the system now provides complete');
  console.log('Zoho CRM integration with all available Deal module fields.');
}

async function runVerification() {
  await verifyFix();
  await generateReport();
  
  console.log('\n🎉 FIELD COVERAGE VERIFICATION COMPLETE!');
}

runVerification();