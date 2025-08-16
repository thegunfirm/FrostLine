const axios = require('axios');

console.log('🔍 FIELD DISCOVERY TOOL');
console.log('📋 Mapping actual API field names vs display names');

class FieldDiscovery {
  constructor() {
    this.baseURL = 'http://localhost:5000';
  }

  async discoverZohoFields(module = 'Deals', recordId = null) {
    try {
      console.log(`\n🔍 Discovering Zoho ${module} fields...`);
      
      // Method 1: Get field metadata from Zoho API
      console.log('📋 Method 1: Field Metadata Discovery');
      const metadataResponse = await axios.get(`${this.baseURL}/api/test/zoho-fields-metadata/${module}`);
      
      if (metadataResponse.data.success) {
        const fields = metadataResponse.data.fields;
        console.log(`✅ Found ${fields.length} fields in ${module} module:`);
        
        const customFields = fields.filter(field => field.custom_field);
        const systemFields = fields.filter(field => !field.custom_field);
        
        console.log(`\n📊 System Fields (${systemFields.length}):`);
        systemFields.slice(0, 10).forEach(field => {
          console.log(`   • ${field.api_name} (${field.data_type}) - "${field.field_label}"`);
        });
        
        console.log(`\n🔧 Custom Fields (${customFields.length}):`);
        customFields.forEach(field => {
          console.log(`   • ${field.api_name} (${field.data_type}) - "${field.field_label}"`);
        });
        
        // Look for our specific fields
        console.log(`\n🎯 Our Target Fields:`);
        const targetFields = ['TGF_Order_Number', 'APP_Response', 'APP_Confirmed', 'APP_Status', 'Order_Status'];
        targetFields.forEach(targetField => {
          const found = fields.find(f => f.api_name === targetField || f.field_label.includes(targetField));
          if (found) {
            console.log(`   ✅ ${targetField}: Found as "${found.api_name}" (${found.field_label})`);
          } else {
            console.log(`   ❌ ${targetField}: Not found in field list`);
          }
        });
      }
      
      // Method 2: Sample record inspection if recordId provided
      if (recordId) {
        console.log(`\n📋 Method 2: Sample Record Inspection (${recordId})`);
        const recordResponse = await axios.get(`${this.baseURL}/api/test/zoho-deal/${recordId}`);
        
        if (recordResponse.data.success) {
          const deal = recordResponse.data.deal;
          console.log('📊 All fields in sample record:');
          
          Object.keys(deal).forEach(key => {
            const value = deal[key];
            const valuePreview = value ? 
              (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : 
              'null/undefined';
            console.log(`   • ${key}: ${valuePreview}`);
          });
          
          // Check our target fields specifically
          console.log(`\n🎯 Target Field Values in Record:`);
          const targetFields = ['TGF_Order_Number', 'APP_Response', 'APP_Confirmed', 'APP_Status', 'Order_Status'];
          targetFields.forEach(field => {
            const value = deal[field];
            console.log(`   • ${field}: ${value || 'undefined'}`);
          });
        }
      }
      
      return metadataResponse.data;
      
    } catch (error) {
      console.error('❌ Field discovery failed:', error.response?.data || error.message);
      return null;
    }
  }

  async discoverOtherAPIs(apiName, endpoint) {
    console.log(`\n🔍 Discovering ${apiName} fields...`);
    try {
      // Generic API field discovery
      const response = await axios.get(`${this.baseURL}${endpoint}`);
      
      if (response.data) {
        const sampleRecord = Array.isArray(response.data) ? response.data[0] : response.data;
        if (sampleRecord && typeof sampleRecord === 'object') {
          console.log(`📊 ${apiName} Field Structure:`);
          Object.keys(sampleRecord).forEach(key => {
            const value = sampleRecord[key];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`   • ${key} (${type})`);
          });
        }
      }
      
      return response.data;
    } catch (error) {
      console.error(`❌ ${apiName} field discovery failed:`, error.message);
      return null;
    }
  }

  async createFieldMappingGuide() {
    console.log('\n📋 Creating Field Mapping Reference Guide...');
    
    // Common field mapping patterns
    const commonMappings = {
      'Zoho CRM': {
        'Display Name → API Name': {
          'Deal Name': 'Deal_Name',
          'Contact Name': 'Contact_Name',
          'TGF Order Number': 'TGF_Order_Number', // Usually matches
          'APP Response': 'APP_Response',
          'Order Status': 'Order_Status'
        },
        'Common Issues': [
          'Custom fields may have numbers appended (e.g., Field_Name1)',
          'Date fields return in different formats than sent',
          'Long text fields may be truncated in list views'
        ]
      },
      'RSR Engine': {
        'Response Fields': {
          'StatusCode': 'result.StatusCode',
          'OrderNumber': 'result.OrderNumber',
          'StatusMessage': 'result.StatusMessage'
        }
      }
    };
    
    console.log('📊 Field Mapping Reference:');
    Object.keys(commonMappings).forEach(api => {
      console.log(`\n🔧 ${api}:`);
      const mapping = commonMappings[api];
      Object.keys(mapping).forEach(section => {
        console.log(`   ${section}:`);
        if (typeof mapping[section] === 'object') {
          Object.keys(mapping[section]).forEach(key => {
            console.log(`      • ${key} → ${mapping[section][key]}`);
          });
        } else if (Array.isArray(mapping[section])) {
          mapping[section].forEach(item => {
            console.log(`      • ${item}`);
          });
        }
      });
    });
    
    return commonMappings;
  }
}

async function runFieldDiscovery() {
  const discovery = new FieldDiscovery();
  
  // Discover Zoho fields
  await discovery.discoverZohoFields('Deals', '6585331000000971011'); // Use recent test deal
  
  // Create reference guide
  await discovery.createFieldMappingGuide();
  
  console.log('\n🎯 FIELD DISCOVERY COMPLETE');
  console.log('📋 Use this information to ensure accurate field mapping in future integrations');
}

// Add endpoint creation for field metadata
async function createFieldDiscoveryEndpoints() {
  console.log('\n🔧 Field Discovery endpoints should be added to server/routes.ts:');
  console.log(`
// Field Discovery endpoints
app.get('/api/test/zoho-fields-metadata/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const zohoService = new ZohoService();
    const fieldsData = await zohoService.getFieldsMetadata(module);
    res.json({ success: true, fields: fieldsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
  `);
}

runFieldDiscovery().then(() => {
  createFieldDiscoveryEndpoints();
  console.log('\\n🔍 Field discovery completed');
}).catch(error => {
  console.error('Field discovery error:', error);
});