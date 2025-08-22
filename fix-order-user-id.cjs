// Fix order.user_id to order.userId in testing endpoint only
const fs = require('fs');

console.log('🔧 Fixing order.user_id to order.userId in testing endpoint');

const filePath = './server/routes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Find the testing endpoint section and fix only that occurrence
const testingSection = content.indexOf('// Testing endpoint for complete order workflow without authentication');
const nextSection = content.indexOf('// Manual Zoho sync endpoint for testing existing orders');

if (testingSection === -1 || nextSection === -1) {
  console.log('❌ Could not find testing endpoint boundaries');
  process.exit(1);
}

// Extract the testing endpoint section
const before = content.substring(0, testingSection);
const testingCode = content.substring(testingSection, nextSection);
const after = content.substring(nextSection);

// Fix only in the testing section
const fixedTestingCode = testingCode
  .replace(/order\.user_id/g, 'order.userId')
  .replace(/user_id: \${order\.userId}/g, 'user_id: ${order.userId}');

// Rebuild the file
const fixedContent = before + fixedTestingCode + after;

fs.writeFileSync(filePath, fixedContent);
console.log('✅ Fixed order.user_id to order.userId in testing endpoint only');
console.log('🔄 Ready to test again');