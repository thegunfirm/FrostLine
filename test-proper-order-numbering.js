#!/usr/bin/env node

/**
 * Test Script: Proper TGF Order Numbering Logic
 * 
 * Tests the new order numbering specification:
 * - TGF ORDER NUMBER (child IDs) with TEST prefix
 * - DEAL NAME (parent label) with TEST prefix
 * - Single group → Base+0
 * - Multiple groups → sorted deterministically, Base+A/B/C with Deal Name = Base+Z
 */

// Mock the service methods for testing
const testService = {
  buildTGFOrderNumber(baseSequence, isTest, isMultiple, groupIndex) {
    // Zero-pad to 7 digits
    const paddedSequence = baseSequence.toString().padStart(7, '0');
    
    // Build base
    const base = isTest ? `test${paddedSequence}` : paddedSequence;
    
    if (!isMultiple) {
      // Single group gets '0' suffix
      return `${base}0`;
    } else {
      // Multiple groups get letter suffixes (A, B, C, ...)
      const letter = String.fromCharCode(65 + (groupIndex || 0)); // A=65, B=66, C=67...
      return `${base}${letter}`;
    }
  },

  buildDealName(baseSequence, isTest, isMultiple) {
    // Zero-pad to 7 digits
    const paddedSequence = baseSequence.toString().padStart(7, '0');
    
    // Build base
    const base = isTest ? `test${paddedSequence}` : paddedSequence;
    
    if (!isMultiple) {
      // Single shipment gets '0' suffix
      return `${base}0`;
    } else {
      // Multiple shipments get 'Z' suffix for parent deal
      return `${base}Z`;
    }
  },

  generateSplitOrderNumbers(baseOrderNumber, outcomes, isTest = false) {
    // Sort outcomes deterministically for consistent ABC assignment
    const sortedOutcomes = [...outcomes].sort((a, b) => a.receiverCode.localeCompare(b.receiverCode));
    
    if (sortedOutcomes.length === 1) {
      // Single shipping outcome - ends in '0'
      return [this.buildTGFOrderNumber(baseOrderNumber, isTest, false)];
    } else {
      // Multiple shipping outcomes - ends in A, B, C, etc.
      return sortedOutcomes.map((outcome, index) => 
        this.buildTGFOrderNumber(baseOrderNumber, isTest, true, index)
      );
    }
  }
};

console.log('🧪 TESTING PROPER TGF ORDER NUMBERING LOGIC\n');

// Test base sequence number
const testSequence = 1234567;
console.log(`📊 Base Sequence: ${testSequence}`);
console.log(`📊 7-digit Zero-pad: ${testSequence.toString().padStart(7, '0')}\n`);

// Test Cases
const testCases = [
  {
    name: 'Single Group - TEST Mode',
    isTest: true,
    isMultiple: false,
    groups: 1
  },
  {
    name: 'Single Group - PRODUCTION Mode', 
    isTest: false,
    isMultiple: false,
    groups: 1
  },
  {
    name: 'Multiple Groups (2) - TEST Mode',
    isTest: true,
    isMultiple: true,
    groups: 2
  },
  {
    name: 'Multiple Groups (2) - PRODUCTION Mode',
    isTest: false,
    isMultiple: true,
    groups: 2
  },
  {
    name: 'Multiple Groups (3) - TEST Mode',
    isTest: true,
    isMultiple: true,
    groups: 3
  },
  {
    name: 'Multiple Groups (3) - PRODUCTION Mode',
    isTest: false,
    isMultiple: true,
    groups: 3
  }
];

console.log('🔬 TESTING TGF ORDER NUMBER GENERATION:\n');

testCases.forEach(testCase => {
  console.log(`\n📋 ${testCase.name}:`);
  
  if (!testCase.isMultiple) {
    // Single group case
    const orderNumber = testService.buildTGFOrderNumber(
      testSequence, 
      testCase.isTest, 
      false
    );
    console.log(`   TGF Order Number: ${orderNumber}`);
  } else {
    // Multiple groups case
    console.log(`   TGF Order Numbers (${testCase.groups} groups):`);
    for (let i = 0; i < testCase.groups; i++) {
      const orderNumber = testService.buildTGFOrderNumber(
        testSequence,
        testCase.isTest,
        true,
        i
      );
      console.log(`     Group ${String.fromCharCode(65 + i)}: ${orderNumber}`);
    }
  }
});

console.log('\n🔬 TESTING DEAL NAME GENERATION:\n');

testCases.forEach(testCase => {
  console.log(`\n📋 ${testCase.name}:`);
  
  const dealName = testService.buildDealName(
    testSequence,
    testCase.isTest,
    testCase.isMultiple
  );
  console.log(`   Deal Name: ${dealName}`);
});

console.log('\n🔬 TESTING ORDER SPLITTING LOGIC:\n');

// Test shipping outcomes
const singleOutcome = [{ receiverCode: 'C' }]; // Customer only
const multipleOutcomes = [
  { receiverCode: 'C' }, // Customer  
  { receiverCode: 'F' }, // FFL
  { receiverCode: 'I' }  // In-House
];

console.log('\n📦 Single Outcome (Customer):');
const singleTestNumbers = testService.generateSplitOrderNumbers(
  testSequence,
  singleOutcome,
  true
);
const singleProdNumbers = testService.generateSplitOrderNumbers(
  testSequence,
  singleOutcome,
  false
);
console.log(`   TEST: ${singleTestNumbers[0]}`);
console.log(`   PROD: ${singleProdNumbers[0]}`);

console.log('\n📦 Multiple Outcomes (Customer, FFL, In-House):');
const multiTestNumbers = testService.generateSplitOrderNumbers(
  testSequence,
  multipleOutcomes,
  true
);
const multiProdNumbers = testService.generateSplitOrderNumbers(
  testSequence,
  multipleOutcomes,
  false
);

console.log('   TEST mode:');
multiTestNumbers.forEach((num, idx) => {
  const letter = String.fromCharCode(65 + idx);
  console.log(`     Group ${letter}: ${num}`);
});

console.log('   PROD mode:');
multiProdNumbers.forEach((num, idx) => {
  const letter = String.fromCharCode(65 + idx);
  console.log(`     Group ${letter}: ${num}`);
});

// Test Deal Names for these scenarios
console.log('\n🏷️ Corresponding Deal Names:');
console.log(`   Single (TEST): ${testService.buildDealName(testSequence, true, false)}`);
console.log(`   Single (PROD): ${testService.buildDealName(testSequence, false, false)}`);
console.log(`   Multiple (TEST): ${testService.buildDealName(testSequence, true, true)}`);
console.log(`   Multiple (PROD): ${testService.buildDealName(testSequence, false, true)}`);

console.log('\n✅ ORDER NUMBERING TEST COMPLETE\n');

// Expected Results Summary
console.log('📝 EXPECTED RESULTS SUMMARY:');
console.log('   Single TEST: test12345670');
console.log('   Single PROD: 12345670');
console.log('   Multi TEST Child: test1234567A, test1234567B, test1234567C');
console.log('   Multi PROD Child: 1234567A, 1234567B, 1234567C');
console.log('   Multi TEST Deal: test1234567Z');
console.log('   Multi PROD Deal: 1234567Z');