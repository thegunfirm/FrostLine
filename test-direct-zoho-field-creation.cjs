/**
 * Test Direct Zoho Field Creation
 * Create a minimal deal with just the system fields to test field compatibility
 */

const axios = require('axios');

async function testDirectZohoFields() {
  console.log('🔬 Testing direct Zoho field creation...\n');

  // Get token from server endpoint instead
  try {
    const tokenResponse = await axios.get('http://localhost:5000/api/test/get-zoho-token');
    const zohoConfig = {
      apiHost: 'https://www.zohoapis.com/crm/v2',
      accessToken: tokenResponse.data.accessToken
    };

    if (!zohoConfig.accessToken) {
      console.error('❌ No Zoho access token available');
      return;
    }

    // Create a minimal deal with only system fields to test field compatibility
  const testFields = {
    Deal_Name: 'Direct Field Test - ' + Date.now(),
    Stage: 'Qualification',
    Amount: 100.00,
    Closing_Date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    
    // Test each system field individually
    TGF_Order_Number: 'TEST001F0',
    Fulfillment_Type: 'Direct-Test',
    Flow: 'TGF-Test',
    Order_Status: 'Test-Status',
    Consignee: 'Test-Consignee',
    Deal_Fulfillment_Summary: 'Test Summary',
    Ordering_Account: '99999',
    Hold_Type: 'Test Hold',
    APP_Status: 'Test APP',
    Submitted: new Date().toISOString()
  };

  const payload = {
    data: [testFields]
  };

  console.log('📤 Sending direct payload to Zoho:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(
      `${zohoConfig.apiHost}/Deals`,
      payload,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📥 Zoho response:', JSON.stringify(response.data, null, 2));

    if (response.data?.data?.[0]?.status === 'success') {
      const dealId = response.data.data[0].details.id;
      console.log(`\n✅ Test deal created successfully!`);
      console.log(`📋 Deal ID: ${dealId}`);
      
      // Try to retrieve it immediately
      console.log('\n🔍 Attempting immediate retrieval...');
      
      const retrieveResponse = await axios.get(
        `${zohoConfig.apiHost}/Deals/${dealId}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${zohoConfig.accessToken}`
          }
        }
      );

      if (retrieveResponse.data?.data?.[0]) {
        const retrievedDeal = retrieveResponse.data.data[0];
        console.log(`✅ Deal retrieved successfully!`);
        
        console.log('\n🔍 Checking system fields in retrieved deal:');
        const systemFields = [
          'TGF_Order_Number',
          'Fulfillment_Type', 
          'Flow',
          'Order_Status',
          'Consignee',
          'Deal_Fulfillment_Summary',
          'Ordering_Account',
          'Hold_Type',
          'APP_Status',
          'Submitted'
        ];

        let fieldsPresent = 0;
        systemFields.forEach(field => {
          const value = retrievedDeal[field];
          if (value !== undefined && value !== null && value !== '') {
            console.log(`   ✅ ${field}: ${value}`);
            fieldsPresent++;
          } else {
            console.log(`   ❌ ${field}: ${value === undefined ? 'UNDEFINED' : value === null ? 'NULL' : 'EMPTY'}`);
          }
        });

        console.log(`\n📊 DIRECT TEST RESULTS:`);
        console.log(`   Deal ID: ${dealId}`);
        console.log(`   Fields Present: ${fieldsPresent}/${systemFields.length}`);
        
        if (fieldsPresent === 0) {
          console.log('\n❌ CRITICAL: No custom fields saved - Field names may be incompatible with Zoho');
          console.log('   This suggests the field names in Zoho CRM don\'t match our API field names');
        } else if (fieldsPresent === systemFields.length) {
          console.log('\n🎉 SUCCESS: All fields properly saved! Field mapping is working correctly');
        } else {
          console.log(`\n⚠️  PARTIAL: ${fieldsPresent} fields saved, ${10 - fieldsPresent} rejected by Zoho`);
        }

      } else {
        console.log('❌ Failed to retrieve test deal');
      }

    } else {
      console.log('❌ Deal creation failed:', response.data);
      
      // Check for field-specific errors
      if (response.data?.data?.[0]?.details?.api_name) {
        console.log('Field errors detected:');
        response.data.data.forEach((item, index) => {
          if (item.details?.api_name) {
            console.log(`   Field "${item.details.api_name}": ${item.message}`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Direct Zoho test failed:', error.response?.data || error.message);
    
    if (error.response?.data?.data) {
      console.log('📋 Detailed error response:');
      error.response.data.data.forEach((errorItem, index) => {
        console.log(`   Error ${index + 1}:`, errorItem);
      });
    }
  } catch (error) {
    console.error('❌ Test initialization failed:', error.message);
  }
}

// Run test
testDirectZohoFields();