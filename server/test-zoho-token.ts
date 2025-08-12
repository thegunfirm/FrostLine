// Quick test to verify Zoho token is working
console.log('Testing Zoho token...');
console.log('Token:', process.env.ZOHO_ACCESS_TOKEN);

async function testToken() {
  try {
    const response = await fetch('https://www.zohoapis.com/crm/v2/Contacts?per_page=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ZOHO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Token is valid!');
      console.log('Found', result.data?.length || 0, 'contacts');
    } else {
      console.log('❌ Token test failed:', result);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testToken();