const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Complete list of 37 expected fields
const EXPECTED_37_FIELDS = [
  'Account_Name', 'Amount', 'APP_Confirmed', 'APP_Response', 'APP_Status',
  'Campaign_Source', 'Carrier', 'Closing_Date', 'Confirmed', 'Consignee',
  'Consignee_Type', 'Contact_Name', 'Conversion_Channel', 'Created_By',
  'Deal_Name', 'Deal_Owner', 'Description', 'Distributor_Order_Number',
  'Estimated_Ship_Date', 'Expected_Revenue', 'Flow', 'Fulfillment_Type',
  'Hold_Cleared_At', 'Hold_Started_At', 'Hold_Type', 'Last_Distributor_Update',
  'Lead_Source', 'Modified_By', 'Next_Step', 'Order_Status',
  'Ordering_Account', 'Pipeline', 'Probability', 'Product_Details',
  'Return_Status', 'Stage', 'Submitted', 'TGF_Order', 'Tracking_Number',
  'Type', 'Webservices_App'
];

async function checkMissingFields() {
  try {
    const response = await execAsync(`curl -s "http://localhost:5000/api/orders/69/activity-logs"`);
    const logData = JSON.parse(response.stdout);
    
    const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
    
    if (dealLog?.details?.dealBreakdown?.[0]?.comprehensiveFields) {
      const currentFields = Object.keys(dealLog.details.dealBreakdown[0].comprehensiveFields).sort();
      
      console.log('🔍 CURRENT VS EXPECTED FIELD ANALYSIS');
      console.log('=' .repeat(50));
      console.log(`Current fields: ${currentFields.length}`);
      console.log(`Expected fields: ${EXPECTED_37_FIELDS.length}`);
      console.log('');
      
      const missing = EXPECTED_37_FIELDS.filter(field => !currentFields.includes(field));
      const unexpected = currentFields.filter(field => !EXPECTED_37_FIELDS.includes(field));
      
      if (missing.length > 0) {
        console.log(`❌ MISSING FIELDS (${missing.length}):`);
        missing.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field}`);
        });
        console.log('');
      }
      
      if (unexpected.length > 0) {
        console.log(`⚠️ UNEXPECTED FIELDS (${unexpected.length}):`);
        unexpected.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field}`);
        });
        console.log('');
      }
      
      console.log('📊 FIELD MAPPING ANALYSIS:');
      console.log(`✅ Correctly implemented: ${currentFields.length - unexpected.length}`);
      console.log(`❌ Missing from expected: ${missing.length}`);
      console.log(`⚠️ Unexpected additions: ${unexpected.length}`);
      console.log(`🎯 Target coverage: ${Math.round(((currentFields.length - unexpected.length + missing.length) / EXPECTED_37_FIELDS.length) * 100)}%`);
      
      // Show all current fields for verification
      console.log('');
      console.log('📋 ALL CURRENT FIELDS:');
      currentFields.forEach((field, index) => {
        const status = EXPECTED_37_FIELDS.includes(field) ? '✅' : '❓';
        console.log(`   ${(index + 1).toString().padStart(2)}. ${status} ${field}`);
      });
      
    } else {
      console.log('❌ No deal fields found');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

checkMissingFields();