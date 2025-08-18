// Test amount formatting to verify Zoho field limits
const testAmount = 117.28999999999999;

console.log('🧪 AMOUNT FORMATTING TESTS\n');

console.log('Original amount:', testAmount);
console.log('Length:', testAmount.toString().length);

console.log('\nMethod 1 - toFixed(2):');
const method1 = parseFloat(testAmount.toFixed(2));
console.log('Result:', method1);
console.log('Length:', method1.toString().length);

console.log('\nMethod 2 - Math.round:');
const method2 = Math.round(testAmount * 100) / 100;
console.log('Result:', method2);
console.log('Length:', method2.toString().length);

console.log('\nMethod 3 - Number with toFixed:');
const method3 = Number(testAmount.toFixed(2));
console.log('Result:', method3);
console.log('Length:', method3.toString().length);

console.log('\nTesting edge cases:');
const bigAmount = 999999999999.99;
console.log('Big amount:', bigAmount);
console.log('Length:', bigAmount.toString().length);
console.log('Rounded:', Math.round(bigAmount * 100) / 100);
console.log('Rounded length:', (Math.round(bigAmount * 100) / 100).toString().length);

console.log('\n✅ Recommended: Use Math.round() method for consistent 2-decimal formatting');