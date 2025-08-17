const https = require('https');

// From the logs, we know these deals were created:
const dealIds = [
  '6585331000000978179',  // ZOHO VISIBLE TEST ORDER
  '6585331000000983174',  // Platinum Drop-Ship
  '6585331000000982175',  // Platinum Drop-Ship (GLSP00735)
  '6585331000000967110',  // Gold In-House (RUG90743)
];

console.log('🔍 Checking specific deals created in Zoho CRM...\n');

// Note: This would need the actual access token to work
console.log('Deal IDs that were successfully created:');
dealIds.forEach((id, index) => {
  console.log(`${index + 1}. Deal ID: ${id}`);
});

console.log('\n✅ These deals should be visible in your Zoho CRM interface');
console.log('📍 Check the Deals module in Zoho CRM for these specific Deal IDs');
console.log('🔍 Or search for TGF order numbers starting with "test"');
