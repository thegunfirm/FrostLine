// Simple test for Zoho email verification fields
const testContact = {
  Email: 'field.validation.test@thegunfirm.com',
  First_Name: 'Field',
  Last_Name: 'Validation',
  Tier: 'Bronze', // We know this field works
  // Testing various email verification field names
  'Email Verified': 'Yes',
  'Email_Verified': true,
  'Email_Verification_Status': 'Verified',
  'Email_Verification_Date': new Date().toISOString()
};

console.log('🧪 Testing Zoho Contact Creation with Email Verification Fields');
console.log('Contact data:', JSON.stringify(testContact, null, 2));

fetch('https://www.zohoapis.com/crm/v2/Contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: [testContact]
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Zoho Response:', JSON.stringify(data, null, 2));
  
  if (data.data?.[0]?.status === 'success') {
    console.log('🎉 Contact created successfully with email verification fields!');
  } else {
    console.log('⚠️ Contact creation had issues - check field names');
  }
})
.catch(error => {
  console.log('❌ Error:', error.message);
});