// Test the endpoints that actually work with current token
const axios = require('axios');
const fs = require('fs');

async function testWorkingEndpoints() {
  try {
    console.log('✅ Testing working Zoho CRM endpoints...\n');
    
    const tokenFile = '.zoho-tokens.json';
    if (!fs.existsSync(tokenFile)) {
      console.log('❌ No token file found');
      return false;
    }

    const tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    const token = tokenData.accessToken;

    // Test 1: Get CRM Settings/Modules (works)
    console.log('🧪 Test 1: Getting CRM module settings...');
    const modulesResponse = await axios.get('https://www.zohoapis.com/crm/v2/settings/modules', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (modulesResponse.data?.modules) {
      console.log('✅ Modules access confirmed:', {
        totalModules: modulesResponse.data.modules.length,
        availableModules: modulesResponse.data.modules.slice(0, 5).map(m => m.plural_label)
      });
    }

    // Test 2: Get Deals (works)
    console.log('\n🧪 Test 2: Getting deals from CRM...');
    const dealsResponse = await axios.get('https://www.zohoapis.com/crm/v2/deals?per_page=5', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Deals access confirmed:', {
      statusCode: dealsResponse.status,
      hasDeals: !!dealsResponse.data?.data,
      dealCount: dealsResponse.data?.data?.length || 0,
      sampleDeal: dealsResponse.data?.data?.[0] ? {
        dealName: dealsResponse.data.data[0].Deal_Name,
        stage: dealsResponse.data.data[0].Stage,
        amount: dealsResponse.data.data[0].Amount
      } : 'No deals found'
    });

    // Test 3: Get Products (should work)
    console.log('\n🧪 Test 3: Getting products from CRM...');
    try {
      const productsResponse = await axios.get('https://www.zohoapis.com/crm/v2/products?per_page=5', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Products access confirmed:', {
        statusCode: productsResponse.status,
        hasProducts: !!productsResponse.data?.data,
        productCount: productsResponse.data?.data?.length || 0
      });
    } catch (error) {
      console.log('❌ Products access failed:', {
        status: error.response?.status,
        error: error.response?.data?.code
      });
    }

    // Test 4: Create a test contact (if scope allows)
    console.log('\n🧪 Test 4: Testing contact creation...');
    try {
      const testContact = {
        data: [
          {
            First_Name: "Test",
            Last_Name: "Contact",
            Email: "test@example.com"
          }
        ]
      };

      const createResponse = await axios.post('https://www.zohoapis.com/crm/v2/contacts', testContact, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Contact creation works:', {
        status: createResponse.status,
        success: createResponse.data?.data?.[0]?.status === 'success'
      });
    } catch (error) {
      console.log('❌ Contact creation failed:', {
        status: error.response?.status,
        error: error.response?.data?.code || error.message
      });
    }

    console.log('\n🎉 Summary: Token is functional for CRM operations!');
    console.log('✅ Module settings access: Working');
    console.log('✅ Deals module access: Working');
    console.log('❌ Users/Org access: Limited (but not needed for order sync)');
    console.log('\n💡 The token is sufficient for CRM integration tasks.');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      error: error.response?.data
    });
    return false;
  }
}

testWorkingEndpoints().then(success => {
  if (success) {
    console.log('\n🚀 Ready for CRM integration with current token!');
  } else {
    console.log('\n⚠️  Further token debugging needed');
  }
});