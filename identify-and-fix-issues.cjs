const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

console.log('🔧 IDENTIFYING AND FIXING POTENTIAL ISSUES');
console.log('Checking for any missing fields or implementation problems');
console.log('=' .repeat(70));

// All 37 expected Zoho Deal fields based on your actual example
const ALL_REQUIRED_FIELDS = [
  'Deal Owner', 'Webservices App', 'Submitted', 'Last Distributor Update',
  'APP Confirmed', 'TGF Order', 'Distributor Order Number', 'APP Response',
  'Carrier', 'Tracking Number', 'Deal Name', 'Account Name', 'Type',
  'Next Step', 'Lead Source', 'Contact Name', 'Modified By',
  'Estimated Ship Date', 'Conversion Channel', 'Flow', 'Order Status',
  'Confirmed', 'Hold Type', 'Hold Started At', 'Hold Cleared At',
  'Return Status', 'Consignee Type', 'Fulfillment Type', 'Ordering Account',
  'Amount', 'Closing Date', 'Pipeline', 'Stage', 'Probability (%)',
  'Expected Revenue', 'Campaign Source', 'Created By'
];

// Convert to expected field names (snake_case)
const EXPECTED_FIELD_NAMES = [
  'Deal_Owner', 'Webservices_App', 'Submitted', 'Last_Distributor_Update',
  'APP_Confirmed', 'TGF_Order', 'Distributor_Order_Number', 'APP_Response',
  'Carrier', 'Tracking_Number', 'Deal_Name', 'Account_Name', 'Type',
  'Next_Step', 'Lead_Source', 'Contact_Name', 'Modified_By',
  'Estimated_Ship_Date', 'Conversion_Channel', 'Flow', 'Order_Status',
  'Confirmed', 'Hold_Type', 'Hold_Started_At', 'Hold_Cleared_At',
  'Return_Status', 'Consignee_Type', 'Fulfillment_Type', 'Ordering_Account',
  'Amount', 'Closing_Date', 'Pipeline', 'Stage', 'Probability',
  'Expected_Revenue', 'Campaign_Source', 'Created_By'
];

async function identifyIssues() {
  try {
    console.log('🔍 Checking latest order for potential issues...');
    
    const response = await execAsync(`curl -s "http://localhost:5000/api/orders/60/activity-logs"`);
    const logData = JSON.parse(response.stdout);
    
    await checkMissingFields(logData);
    await checkFieldNaming(logData);
    await checkTGFConsistency(logData);
    await identifyFixNeeded();
    
  } catch (error) {
    console.error('❌ Issue identification failed:', error.message);
  }
}

async function checkMissingFields(logData) {
  console.log('📋 CHECKING FOR MISSING FIELDS:');
  console.log('=' .repeat(50));
  
  const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
  
  if (dealLog?.details?.dealBreakdown?.[0]?.comprehensiveFields) {
    const actualFields = Object.keys(dealLog.details.dealBreakdown[0].comprehensiveFields);
    
    console.log(`Current Implementation: ${actualFields.length} fields`);
    console.log(`Expected Total: ${EXPECTED_FIELD_NAMES.length} fields`);
    
    const missing = EXPECTED_FIELD_NAMES.filter(field => !actualFields.includes(field));
    
    if (missing.length > 0) {
      console.log(`❌ MISSING FIELDS (${missing.length}):`);
      missing.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field}`);
      });
      console.log('🔧 NEEDS FIX: Add missing fields to ComprehensiveDealFieldMapper');
    } else {
      console.log('✅ All expected fields present');
    }
    
    // Check for incorrectly named fields
    const unexpected = actualFields.filter(field => !EXPECTED_FIELD_NAMES.includes(field));
    if (unexpected.length > 0) {
      console.log(`⚠️ UNEXPECTED FIELDS (${unexpected.length}):`);
      unexpected.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field}`);
      });
    }
  }
  console.log('');
}

async function checkFieldNaming(logData) {
  console.log('🏷️ CHECKING FIELD NAMING CONSISTENCY:');
  console.log('=' .repeat(50));
  
  const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
  
  if (dealLog?.details?.dealBreakdown?.[0]?.comprehensiveFields) {
    const fields = dealLog.details.dealBreakdown[0].comprehensiveFields;
    
    // Check for specific field naming issues
    const namingIssues = [];
    
    // Check if 'Deal_Owner' vs 'Deal Owner'
    if (!fields.hasOwnProperty('Deal_Owner') && !fields.hasOwnProperty('Deal Owner')) {
      namingIssues.push('Deal_Owner field missing');
    }
    
    // Check probability field naming
    if (!fields.hasOwnProperty('Probability') && !fields.hasOwnProperty('Probability_Percent')) {
      namingIssues.push('Probability field may have naming issue');
    }
    
    if (namingIssues.length > 0) {
      console.log('❌ NAMING ISSUES FOUND:');
      namingIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      console.log('🔧 NEEDS FIX: Correct field naming in mapper');
    } else {
      console.log('✅ Field naming appears consistent');
    }
  }
  console.log('');
}

async function checkTGFConsistency(logData) {
  console.log('🔢 CHECKING TGF ORDER NUMBER CONSISTENCY:');
  console.log('=' .repeat(50));
  
  const numberingLog = logData.logs.find(log => log.event_type === 'order_numbering');
  const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
  
  if (numberingLog && dealLog) {
    const tgfNumber = numberingLog.details?.tgfOrderNumber;
    const dealBreakdown = dealLog.details?.dealBreakdown || [];
    
    console.log(`Generated TGF: ${tgfNumber}`);
    
    let consistencyIssues = 0;
    dealBreakdown.forEach((deal, index) => {
      const dealTGF = deal.comprehensiveFields?.TGF_Order;
      if (dealTGF !== tgfNumber) {
        console.log(`❌ Deal ${index + 1} TGF mismatch: ${dealTGF} vs ${tgfNumber}`);
        consistencyIssues++;
      } else {
        console.log(`✅ Deal ${index + 1} TGF consistent: ${dealTGF}`);
      }
    });
    
    if (consistencyIssues > 0) {
      console.log('🔧 NEEDS FIX: TGF number consistency issues');
    } else {
      console.log('✅ TGF numbering fully consistent');
    }
  }
  console.log('');
}

async function identifyFixNeeded() {
  console.log('🔧 IDENTIFYING REQUIRED FIXES:');
  console.log('=' .repeat(50));
  
  // Re-check current implementation
  const response = await execAsync(`curl -s "http://localhost:5000/api/orders/60/activity-logs"`);
  const logData = JSON.parse(response.stdout);
  const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
  
  if (dealLog?.details?.dealBreakdown?.[0]?.comprehensiveFields) {
    const currentFields = Object.keys(dealLog.details.dealBreakdown[0].comprehensiveFields);
    const missing = EXPECTED_FIELD_NAMES.filter(field => !currentFields.includes(field));
    
    console.log('📊 CURRENT STATUS:');
    console.log(`   Implemented: ${currentFields.length} fields`);
    console.log(`   Missing: ${missing.length} fields`);
    console.log(`   Coverage: ${Math.round((currentFields.length / EXPECTED_FIELD_NAMES.length) * 100)}%`);
    console.log('');
    
    if (missing.length > 0) {
      console.log('🚨 FIX REQUIRED - MISSING FIELDS:');
      console.log('The following fields need to be added to reach 100% coverage:');
      missing.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field}`);
      });
      console.log('');
      console.log('🔧 ACTION NEEDED:');
      console.log('   Update ComprehensiveDealFieldMapper to include missing fields');
      console.log('   Ensure all 37 Zoho Deal fields are implemented');
      
      return { needsFix: true, missingFields: missing };
    } else {
      console.log('✅ NO FIX NEEDED - All fields implemented correctly');
      return { needsFix: false, missingFields: [] };
    }
  }
}

async function runDiagnosis() {
  await identifyIssues();
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 DIAGNOSIS COMPLETE');
  console.log('═'.repeat(70));
  console.log('If issues were found above, fixes will be implemented automatically');
}

runDiagnosis();