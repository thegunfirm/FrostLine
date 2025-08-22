#!/usr/bin/env node

/**
 * Direct Zoho Token Test
 * Tests if our Zoho tokens are actually working
 */

async function testZohoTokens() {
  console.log('🔑 Testing Zoho Tokens Directly');
  console.log('==============================');

  // Get tokens from environment (simulating what the server does)
  const accessToken = process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN || process.env.ZOHO_ACCESS_TOKEN;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  console.log('Token Status:');
  console.log(`Access Token: ${accessToken ? `${accessToken.substring(0, 20)}... (${accessToken.length} chars)` : 'MISSING'}`);
  console.log(`Refresh Token: ${refreshToken ? `${refreshToken.substring(0, 20)}... (${refreshToken.length} chars)` : 'MISSING'}`);

  if (!accessToken) {
    console.log('❌ No access token found');
    return;
  }

  try {
    // Test 1: Simple API call to get user info
    console.log('\n🧪 Test 1: Get User Info');
    const userResponse = await fetch('https://www.zohoapis.com/crm/v2/users', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const userResult = await userResponse.text();
    console.log(`Response Status: ${userResponse.status}`);
    
    if (userResponse.ok) {
      const userData = JSON.parse(userResult);
      console.log('✅ User API call successful');
      console.log(`Users found: ${userData.users ? userData.users.length : 0}`);
    } else {
      console.log('❌ User API call failed');
      console.log('Response:', userResult);
    }

    // Test 2: Try to get contacts
    console.log('\n🧪 Test 2: Get Contacts');
    const contactsResponse = await fetch('https://www.zohoapis.com/crm/v2/Contacts?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const contactsResult = await contactsResponse.text();
    console.log(`Response Status: ${contactsResponse.status}`);
    
    if (contactsResponse.ok) {
      const contactsData = JSON.parse(contactsResult);
      console.log('✅ Contacts API call successful');
      console.log(`Contacts found: ${contactsData.data ? contactsData.data.length : 0}`);
    } else {
      console.log('❌ Contacts API call failed');
      console.log('Response:', contactsResult);
    }

    // Test 3: Try to get products
    console.log('\n🧪 Test 3: Get Products');
    const productsResponse = await fetch('https://www.zohoapis.com/crm/v2/Products?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const productsResult = await productsResponse.text();
    console.log(`Response Status: ${productsResponse.status}`);
    
    if (productsResponse.ok) {
      const productsData = JSON.parse(productsResult);
      console.log('✅ Products API call successful');
      console.log(`Products found: ${productsData.data ? productsData.data.length : 0}`);
    } else {
      console.log('❌ Products API call failed');
      console.log('Response:', productsResult);
    }

    // Test 4: Try to get deals
    console.log('\n🧪 Test 4: Get Deals');
    const dealsResponse = await fetch('https://www.zohoapis.com/crm/v2/Deals?per_page=1', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const dealsResult = await dealsResponse.text();
    console.log(`Response Status: ${dealsResponse.status}`);
    
    if (dealsResponse.ok) {
      const dealsData = JSON.parse(dealsResult);
      console.log('✅ Deals API call successful');
      console.log(`Deals found: ${dealsData.data ? dealsData.data.length : 0}`);
    } else {
      console.log('❌ Deals API call failed');
      console.log('Response:', dealsResult);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testZohoTokens();