// Simple script to check Zoho without TypeScript issues
const https = require('https');

async function makeZohoRequest(endpoint, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.zohoapis.com',
      port: 443,
      path: `/crm/v2/${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkZohoData() {
  const accessToken = process.env.ZOHO_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No Zoho access token found');
    return;
  }

  console.log('🔍 Checking recent Deals...');
  
  try {
    // Check recent deals
    const dealsResponse = await makeZohoRequest('Deals?fields=Deal_Name,Amount,Stage,id,Description,TGF_Order_Number&per_page=10&sort_order=desc&sort_by=Created_Time', accessToken);
    
    if (dealsResponse.data) {
      console.log('\n📋 Recent Deals:');
      dealsResponse.data.forEach((deal, index) => {
        console.log(`  ${index + 1}. ${deal.Deal_Name} (ID: ${deal.id})`);
        console.log(`     Amount: $${deal.Amount}`);
        console.log(`     Stage: ${deal.Stage}`);
        console.log(`     TGF Order: ${deal.TGF_Order_Number || 'N/A'}`);
        
        // Check if this is our test order
        if (deal.Deal_Name?.includes('TGF-ORDER-19') || deal.TGF_Order_Number === '19') {
          console.log('     ✅ THIS IS OUR TEST ORDER!');
        }
        console.log('');
      });
      
      // Check for TGF-ORDER-19 specifically
      const targetDeal = dealsResponse.data.find(d => 
        d.Deal_Name?.includes('TGF-ORDER-19') || d.TGF_Order_Number === '19'
      );
      
      if (targetDeal) {
        console.log('🎯 Found TGF-ORDER-19! Getting detailed info...');
        const detailResponse = await makeZohoRequest(`Deals/${targetDeal.id}`, accessToken);
        console.log('📋 Deal Details:', JSON.stringify(detailResponse, null, 2));
      }
    } else {
      console.log('❌ No deals found or error:', dealsResponse);
    }

    // Check Products module for our test products
    console.log('\n🏭 Checking Products module...');
    
    // Look for our Glock
    const glockResponse = await makeZohoRequest('Products/search?criteria=(Product_Code:equals:PR1755503FS)', accessToken);
    if (glockResponse.data && glockResponse.data.length > 0) {
      console.log('✅ Glock found in Products module:');
      console.log('   ID:', glockResponse.data[0].id);
      console.log('   Name:', glockResponse.data[0].Product_Name);
      console.log('   Code:', glockResponse.data[0].Product_Code);
    } else {
      console.log('❌ Glock not found in Products module');
    }
    
    // Look for our Shield accessory
    const shieldResponse = await makeZohoRequest('Products/search?criteria=(Product_Code:equals:G19-ME-5-RED)', accessToken);
    if (shieldResponse.data && shieldResponse.data.length > 0) {
      console.log('✅ Shield accessory found in Products module:');
      console.log('   ID:', shieldResponse.data[0].id);
      console.log('   Name:', shieldResponse.data[0].Product_Name);
      console.log('   Code:', shieldResponse.data[0].Product_Code);
    } else {
      console.log('❌ Shield accessory not found in Products module');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkZohoData();