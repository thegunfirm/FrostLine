const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

console.log('🔍 COMPLETE DEAL MODULE FIELD VERIFICATION');
console.log('Comparing current implementation vs required Zoho Deal fields');
console.log('=' .repeat(70));

// Fields from the user's actual Zoho Deal example
const REQUIRED_ZOHO_DEAL_FIELDS = [
  'Deal Owner',
  'Webservices App', 
  'Submitted',
  'Last Distributor Update',
  'APP Confirmed',
  'TGF Order',
  'Distributor Order Number',
  'APP Response',
  'Carrier',
  'Tracking Number',
  'Deal Name',
  'Account Name',
  'Type',
  'Next Step',
  'Lead Source',
  'Contact Name',
  'Modified By',
  'Estimated Ship Date',
  'Conversion Channel',
  'Flow',
  'Order Status',
  'Confirmed',
  'Hold Type',
  'Hold Started At',
  'Hold Cleared At',
  'Return Status',
  'Consignee Type',
  'Fulfillment Type',
  'Ordering Account',
  'Amount',
  'Closing Date',
  'Pipeline',
  'Stage',
  'Probability (%)',
  'Expected Revenue',
  'Campaign Source',
  'Created By'
];

async function processOrderAndAnalyzeFields() {
  try {
    console.log('🚀 Step 1: Processing new order...');
    
    const response = await execAsync(`curl -X POST "http://localhost:5000/api/process-enhanced-order" \\
      -H "Content-Type: application/json" --silent`);
    
    const result = JSON.parse(response.stdout);
    
    if (result.success) {
      console.log(`✅ Order processed: ${result.orderId} (${result.tgfOrderNumber})`);
      await analyzeCurrentFields(result.orderId);
    } else {
      console.log('❌ Order processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Order processing error:', error.message);
  }
}

async function analyzeCurrentFields(orderId) {
  console.log('\n📋 Step 2: Analyzing current Deal field mapping...');
  console.log('=' .repeat(50));
  
  try {
    const response = await execAsync(`curl -s "http://localhost:5000/api/orders/${orderId}/activity-logs"`);
    const logData = JSON.parse(response.stdout);
    
    const dealLog = logData.logs.find(log => log.event_type === 'deal_creation');
    
    if (dealLog && dealLog.details && dealLog.details.dealBreakdown) {
      const deal = dealLog.details.dealBreakdown[0]; // Get first deal
      
      if (deal.comprehensiveFields) {
        const currentFields = Object.keys(deal.comprehensiveFields).sort();
        console.log('✅ CURRENTLY IMPLEMENTED FIELDS:');
        console.log(`   Total: ${currentFields.length} fields`);
        console.log('');
        
        currentFields.forEach((field, index) => {
          console.log(`   ${(index + 1).toString().padStart(2)}. ${field}`);
        });
        
        console.log('');
        await identifyMissingFields(currentFields);
        await showFieldMapping(deal.comprehensiveFields);
        
      } else {
        console.log('❌ No comprehensive fields found');
      }
    } else {
      console.log('❌ Deal creation log not found');
    }
    
  } catch (error) {
    console.error('❌ Field analysis failed:', error.message);
  }
}

async function identifyMissingFields(currentFields) {
  console.log('🔍 Step 3: Identifying missing standard Zoho Deal fields...');
  console.log('=' .repeat(50));
  
  // Convert field names to snake_case/underscore format for comparison
  const normalizeField = (field) => {
    return field
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[()%]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };
  
  const currentNormalized = currentFields.map(f => normalizeField(f));
  const requiredNormalized = REQUIRED_ZOHO_DEAL_FIELDS.map(f => normalizeField(f));
  
  const missing = [];
  REQUIRED_ZOHO_DEAL_FIELDS.forEach((field, index) => {
    const normalized = requiredNormalized[index];
    if (!currentNormalized.includes(normalized)) {
      missing.push(field);
    }
  });
  
  console.log('❌ MISSING FIELDS FROM STANDARD ZOHO DEAL MODULE:');
  console.log(`   Total Missing: ${missing.length} fields`);
  console.log('');
  
  if (missing.length > 0) {
    missing.forEach((field, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${field}`);
    });
  } else {
    console.log('   🎉 All required fields are implemented!');
  }
  
  console.log('');
  console.log('📊 FIELD COVERAGE ANALYSIS:');
  console.log(`   ✅ Implemented: ${currentFields.length} fields`);
  console.log(`   ❌ Missing: ${missing.length} fields`);
  console.log(`   📋 Required Total: ${REQUIRED_ZOHO_DEAL_FIELDS.length} fields`);
  console.log(`   📈 Coverage: ${Math.round((currentFields.length / REQUIRED_ZOHO_DEAL_FIELDS.length) * 100)}%`);
}

async function showFieldMapping(fields) {
  console.log('\n🗺️  Step 4: Current field mapping details...');
  console.log('=' .repeat(50));
  
  const fieldCategories = {
    'Core Deal Information': [
      'Deal_Name', 'TGF_Order', 'Fulfillment_Type', 'Flow', 'Order_Status', 
      'Consignee', 'Ordering_Account', 'APP_Status', 'APP_Response'
    ],
    'Shipping & Tracking': [
      'Carrier', 'Tracking_Number', 'Estimated_Ship_Date', 'Distributor_Order_Number'
    ],
    'Timestamps': [
      'Submitted', 'APP_Confirmed', 'Last_Distributor_Update'
    ],
    'Sales Pipeline': [
      'Deal_Owner', 'Account_Name', 'Contact_Name', 'Type', 'Next_Step', 
      'Lead_Source', 'Closing_Date', 'Pipeline', 'Stage', 'Probability', 
      'Expected_Revenue', 'Campaign_Source'
    ],
    'Extended Management': [
      'Conversion_Channel', 'Confirmed', 'Hold_Type', 'Hold_Started_At', 
      'Hold_Cleared_At', 'Return_Status', 'Consignee_Type'
    ],
    'System Fields': [
      'Modified_By', 'Created_By'
    ],
    'Financial': [
      'Amount', 'Description'
    ],
    'Product Subform': [
      'Product_Details'
    ]
  };
  
  Object.keys(fieldCategories).forEach(category => {
    const categoryFields = fieldCategories[category];
    const implementedCount = categoryFields.filter(field => fields.hasOwnProperty(field)).length;
    
    console.log(`📋 ${category}:`);
    console.log(`   Coverage: ${implementedCount}/${categoryFields.length} fields`);
    
    categoryFields.forEach(field => {
      const status = fields.hasOwnProperty(field) ? '✅' : '❌';
      const value = fields[field] !== undefined ? ` = ${JSON.stringify(fields[field]).substring(0, 50)}...` : '';
      console.log(`   ${status} ${field}${value}`);
    });
    console.log('');
  });
}

async function generateSummaryReport() {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 DEAL MODULE FIELD MAPPING ANALYSIS - SUMMARY');
  console.log('═'.repeat(70));
  
  console.log('🎯 KEY FINDINGS:');
  console.log('');
  console.log('The user provided an actual Zoho Deal example showing these fields:');
  console.log('- Deal Owner, Account Name, Contact Name, Type, Next Step');
  console.log('- Lead Source, Closing Date, Pipeline, Stage, Probability');
  console.log('- Expected Revenue, Campaign Source, Conversion Channel');
  console.log('- Hold management fields, Return Status, System audit fields');
  console.log('');
  
  console.log('🚀 REQUIRED ACTIONS:');
  console.log('');
  console.log('1. Update ComprehensiveDealFieldMapper to include ALL missing fields');
  console.log('2. Ensure field names match exact Zoho Deal module specifications');
  console.log('3. Test integration with complete field mapping');
  console.log('4. Verify all 36+ standard Zoho Deal fields are populated');
  
  console.log('');
  console.log('📋 TARGET: Complete Zoho Deal module compatibility');
  console.log('📈 GOAL: 100% field coverage for full CRM integration');
}

async function runCompleteVerification() {
  await processOrderAndAnalyzeFields();
  await generateSummaryReport();
  
  console.log('\n🎉 COMPLETE DEAL FIELDS VERIFICATION FINISHED!');
}

runCompleteVerification();