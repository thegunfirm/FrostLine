// Fix script to address all database query issues
const fs = require('fs');

console.log('🔧 Fixing database query issues in routes.ts');

// Read the current file
const filePath = './server/routes.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all instances of snake_case column names to camelCase
const fixes = [
  {
    from: 'first_name: users.first_name',
    to: 'firstName: users.firstName'
  },
  {
    from: 'last_name: users.last_name', 
    to: 'lastName: users.lastName'
  },
  {
    from: 'subscription_tier: users.subscription_tier',
    to: 'subscriptionTier: users.subscriptionTier'
  },
  {
    from: 'customer[0].first_name',
    to: 'customer[0].firstName'
  },
  {
    from: 'customer[0].last_name',
    to: 'customer[0].lastName'
  },
  {
    from: 'customer[0].subscription_tier',
    to: 'customer[0].subscriptionTier'
  }
];

// Apply all fixes
fixes.forEach(fix => {
  const before = content.split(fix.from).length - 1;
  content = content.replaceAll(fix.from, fix.to);
  const after = content.split(fix.to).length - 1;
  console.log(`✅ Fixed "${fix.from}" → "${fix.to}" (${before} occurrences)`);
});

// Write the fixed file
fs.writeFileSync(filePath, content);
console.log('🎯 All database query issues fixed in routes.ts');
console.log('🔄 Restarting server to apply fixes...');