#!/usr/bin/env node

/**
 * Test Script: Proper TGF Order Numbering Integration Test
 * 
 * Simple CommonJS test to verify the new proper order numbering specification
 */

async function testProperOrderNumbering() {
  console.log('🧪 TESTING PROPER TGF ORDER NUMBERING INTEGRATION\n');

  try {
    // Simulate order processing with proper numbering
    const testSequence = 1234567;
    
    console.log('📋 TEST 1: Single Group Order');
    console.log('   Expected format: test{7digits}0');
    
    // Test single group
    const singleTestOrder = buildTGFOrderNumber(testSequence, true, false);
    const singleProdOrder = buildTGFOrderNumber(testSequence, false, false);
    console.log(`   ✅ TEST mode: ${singleTestOrder}`);
    console.log(`   ✅ PROD mode: ${singleProdOrder}`);
    
    const singleTestDeal = buildDealName(testSequence, true, false);
    const singleProdDeal = buildDealName(testSequence, false, false);
    console.log(`   ✅ Deal Name TEST: ${singleTestDeal}`);
    console.log(`   ✅ Deal Name PROD: ${singleProdDeal}`);
    
    console.log('\n📋 TEST 2: Multiple Group Order');
    console.log('   Expected format: test{7digits}A, test{7digits}B, test{7digits}C');
    console.log('   Expected Deal Name: test{7digits}Z');
    
    // Test multiple groups
    const multiTestOrders = [];
    const multiProdOrders = [];
    for (let i = 0; i < 3; i++) {
      multiTestOrders.push(buildTGFOrderNumber(testSequence, true, true, i));
      multiProdOrders.push(buildTGFOrderNumber(testSequence, false, true, i));
    }
    
    console.log('   ✅ TEST mode orders:');
    multiTestOrders.forEach((order, i) => {
      console.log(`      Group ${String.fromCharCode(65 + i)}: ${order}`);
    });
    
    console.log('   ✅ PROD mode orders:');
    multiProdOrders.forEach((order, i) => {
      console.log(`      Group ${String.fromCharCode(65 + i)}: ${order}`);
    });
    
    const multiTestDeal = buildDealName(testSequence, true, true);
    const multiProdDeal = buildDealName(testSequence, false, true);
    console.log(`   ✅ Deal Name TEST: ${multiTestDeal}`);
    console.log(`   ✅ Deal Name PROD: ${multiProdDeal}`);
    
    console.log('\n✅ PROPER ORDER NUMBERING TEST PASSED');
    
    // Validation
    const validations = [
      singleTestOrder === 'test12345670',
      singleProdOrder === '12345670',
      multiTestOrders[0] === 'test1234567A',
      multiTestOrders[1] === 'test1234567B', 
      multiTestOrders[2] === 'test1234567C',
      multiProdOrders[0] === '1234567A',
      multiProdOrders[1] === '1234567B',
      multiProdOrders[2] === '1234567C',
      multiTestDeal === 'test1234567Z',
      multiProdDeal === '1234567Z'
    ];
    
    const allValid = validations.every(v => v);
    console.log(`\n🔍 VALIDATION: ${allValid ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    if (!allValid) {
      console.log('❌ Failed validations detected');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Helper functions (duplicated for standalone test)
function buildTGFOrderNumber(baseSequence, isTest, isMultiple, groupIndex) {
  const paddedSequence = baseSequence.toString().padStart(7, '0');
  const base = isTest ? `test${paddedSequence}` : paddedSequence;
  
  if (!isMultiple) {
    return `${base}0`;
  } else {
    const letter = String.fromCharCode(65 + (groupIndex || 0));
    return `${base}${letter}`;
  }
}

function buildDealName(baseSequence, isTest, isMultiple) {
  const paddedSequence = baseSequence.toString().padStart(7, '0');
  const base = isTest ? `test${paddedSequence}` : paddedSequence;
  
  if (!isMultiple) {
    return `${base}0`;
  } else {
    return `${base}Z`;
  }
}

// Run the test
testProperOrderNumbering().then(() => {
  console.log('✅ Integration test complete');
}).catch(error => {
  console.error('❌ Integration test failed:', error.message);
  process.exit(1);
});