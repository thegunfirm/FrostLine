/**
 * Comprehensive Test: Dynamic Product Lookup & ABC Deal Naming
 * Tests the new system with real inventory and multiple shipping scenarios
 */

const fetch = require('node-fetch');

// Mock test users for realistic testing
const TEST_USERS = [
  {
    id: 'test_user_1',
    email: 'john.smith@testgunfirm.com',
    name: 'John Smith',
    tier: 'Gold Monthly',
    ffl: 'Smith\'s Gun Shop'
  },
  {
    id: 'test_user_2', 
    email: 'sarah.johnson@testgunfirm.com',
    name: 'Sarah Johnson',
    tier: 'Platinum Monthly',
    ffl: 'Johnson\'s Firearms'
  },
  {
    id: 'test_user_3',
    email: 'mike.wilson@testgunfirm.com', 
    name: 'Mike Wilson',
    tier: 'Bronze',
    ffl: 'Wilson\'s Outdoor'
  }
];

// Real inventory items for testing
const REAL_INVENTORY_ITEMS = [
  {
    sku: 'GLOCK-19-GEN5',
    productName: 'Glock 19 Gen5 9mm Pistol',
    manufacturer: 'Glock',
    category: 'Handguns',
    unitPrice: 549.99,
    fflRequired: true,
    dropShipEligible: false,
    inHouseOnly: true,
    rsrStockNumber: 'PI1950203',
    distributor: 'RSR'
  },
  {
    sku: 'SIG-P320-COMPACT',
    productName: 'Sig Sauer P320 Compact 9mm',
    manufacturer: 'Sig Sauer', 
    category: 'Handguns',
    unitPrice: 599.99,
    fflRequired: true,
    dropShipEligible: true,
    rsrStockNumber: 'SIG320C9BSS',
    distributor: 'RSR'
  },
  {
    sku: 'MAGPUL-PMAG-30',
    productName: 'Magpul PMAG 30-Round Magazine',
    manufacturer: 'Magpul',
    category: 'Magazines', 
    unitPrice: 14.99,
    fflRequired: false,
    dropShipEligible: true,
    rsrStockNumber: 'MAG571BLK',
    distributor: 'RSR'
  },
  {
    sku: 'AR15-PMAG-30',
    productName: 'AR-15 PMAG 30-Round Magazine',
    manufacturer: 'Magpul',
    category: 'Magazines',
    unitPrice: 12.99, 
    fflRequired: false,
    dropShipEligible: true,
    rsrStockNumber: 'MAG557BLK',
    distributor: 'RSR'
  },
  {
    sku: 'RUGER-10-22',
    productName: 'Ruger 10/22 Carbine .22 LR',
    manufacturer: 'Ruger',
    category: 'Rifles',
    unitPrice: 329.99,
    fflRequired: true,
    dropShipEligible: true,
    rsrStockNumber: 'RUG1103',
    distributor: 'RSR'
  }
];

class ZohoIntegrationTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000'; // Development server
    this.testResults = [];
  }

  /**
   * Test 1: Single-receiver order (TGF-XXXXXX-0)
   */
  async testSingleReceiverOrder() {
    console.log('\n🔄 TEST 1: Single Receiver Order (In-House)');
    
    const user = TEST_USERS[0];
    const product = REAL_INVENTORY_ITEMS[0]; // Glock 19
    
    const testOrder = {
      userId: user.id,
      customerEmail: user.email,
      customerName: user.name,
      membershipTier: user.tier,
      orderItems: [{
        ...product,
        quantity: 1,
        totalPrice: product.unitPrice
      }],
      shippingOutcome: 'In-House',
      fflDealerName: user.ffl,
      totalAmount: product.unitPrice,
      testType: 'single-receiver'
    };

    try {
      console.log('  📋 Creating order with SKU:', product.sku);
      console.log('  🎯 Expected deal name pattern: TGF-XXXXXX-0');
      
      // Submit test order 
      const response = await fetch(`${this.baseUrl}/api/test-zoho-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });

      const result = await response.json();
      
      console.log('  ✅ Single-receiver test result:', {
        success: result.success,
        dealName: result.dealName,
        dealId: result.dealId,
        productCreated: result.productCreated,
        productLookupResult: result.productLookupResult
      });

      // Verify deal name format
      const expectedPattern = /^TGF-\d{7}-0$/;
      const dealNameValid = expectedPattern.test(result.dealName);
      
      console.log('  🔍 Deal name validation:', {
        dealName: result.dealName,
        expectedPattern: 'TGF-XXXXXXX-0',
        valid: dealNameValid
      });

      this.testResults.push({
        test: 'Single Receiver',
        success: result.success && dealNameValid,
        dealName: result.dealName,
        productCreated: result.productCreated
      });

      return result;

    } catch (error) {
      console.error('  ❌ Single-receiver test error:', error);
      this.testResults.push({
        test: 'Single Receiver',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 2: Multi-receiver order (TGF-XXXXXX-AZ, TGF-XXXXXX-BZ)
   */
  async testMultiReceiverOrder() {
    console.log('\n🔄 TEST 2: Multi-Receiver Order (Drop-Ship + FFL)');
    
    const user = TEST_USERS[1];
    const handgun = REAL_INVENTORY_ITEMS[1]; // Sig P320
    const magazine = REAL_INVENTORY_ITEMS[2]; // PMAG 30
    
    const testOrder = {
      userId: user.id,
      customerEmail: user.email,
      customerName: user.name,
      membershipTier: user.tier,
      orderItems: [
        {
          ...handgun,
          quantity: 1,
          totalPrice: handgun.unitPrice,
          shippingOutcome: 'Drop-Ship-FFL'
        },
        {
          ...magazine,
          quantity: 3,
          totalPrice: magazine.unitPrice * 3,
          shippingOutcome: 'Drop-Ship-Customer'
        }
      ],
      totalAmount: handgun.unitPrice + (magazine.unitPrice * 3),
      testType: 'multi-receiver',
      shippingOutcomes: [
        {
          type: 'Drop-Ship-FFL',
          fflDealerName: user.ffl,
          orderItems: [handgun.sku]
        },
        {
          type: 'Drop-Ship-Customer', 
          customerAddress: '123 Main St, Anytown, ST 12345',
          orderItems: [magazine.sku]
        }
      ]
    };

    try {
      console.log('  📋 Creating multi-receiver order with SKUs:', 
        testOrder.orderItems.map(i => i.sku).join(', '));
      console.log('  🎯 Expected deal names: TGF-XXXXXX-AZ, TGF-XXXXXX-BZ');
      
      // Submit test order
      const response = await fetch(`${this.baseUrl}/api/test-zoho-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });

      const result = await response.json();
      
      console.log('  ✅ Multi-receiver test result:', {
        success: result.success,
        dealsCreated: result.deals ? result.deals.length : 0,
        dealNames: result.deals ? result.deals.map(d => d.dealName) : [],
        productsCreated: result.productsCreated
      });

      // Verify deal name formats
      if (result.deals && result.deals.length === 2) {
        const patternA = /^TGF-\d{7}-AZ$/;
        const patternB = /^TGF-\d{7}-BZ$/;
        
        const dealAValid = patternA.test(result.deals[0].dealName);
        const dealBValid = patternB.test(result.deals[1].dealName);
        
        console.log('  🔍 Deal names validation:', {
          dealA: { name: result.deals[0].dealName, valid: dealAValid },
          dealB: { name: result.deals[1].dealName, valid: dealBValid }
        });

        this.testResults.push({
          test: 'Multi Receiver',
          success: result.success && dealAValid && dealBValid,
          dealNames: result.deals.map(d => d.dealName),
          productsCreated: result.productsCreated
        });
      }

      return result;

    } catch (error) {
      console.error('  ❌ Multi-receiver test error:', error);
      this.testResults.push({
        test: 'Multi Receiver',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 3: Duplicate SKU handling
   */
  async testDuplicateSKUHandling() {
    console.log('\n🔄 TEST 3: Duplicate SKU Handling (Same SKU Multiple Times)');
    
    const user = TEST_USERS[2];
    const magazine = REAL_INVENTORY_ITEMS[3]; // AR-15 PMAG
    
    const testOrder = {
      userId: user.id,
      customerEmail: user.email,
      customerName: user.name,
      membershipTier: user.tier,
      orderItems: [
        {
          ...magazine,
          quantity: 5,
          totalPrice: magazine.unitPrice * 5
        },
        {
          ...magazine, // Same SKU again
          quantity: 10,
          totalPrice: magazine.unitPrice * 10
        }
      ],
      shippingOutcome: 'Drop-Ship-Customer',
      totalAmount: (magazine.unitPrice * 5) + (magazine.unitPrice * 10),
      testType: 'duplicate-sku'
    };

    try {
      console.log('  📋 Creating order with duplicate SKU:', magazine.sku);
      console.log('  🎯 Expected: Single product creation, no duplicates');
      
      // Submit test order
      const response = await fetch(`${this.baseUrl}/api/test-zoho-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });

      const result = await response.json();
      
      console.log('  ✅ Duplicate SKU test result:', {
        success: result.success,
        dealName: result.dealName,
        productsCreated: result.productsCreated,
        duplicateHandling: result.duplicateHandling
      });

      this.testResults.push({
        test: 'Duplicate SKU',
        success: result.success,
        dealName: result.dealName,
        productsCreated: result.productsCreated
      });

      return result;

    } catch (error) {
      console.error('  ❌ Duplicate SKU test error:', error);
      this.testResults.push({
        test: 'Duplicate SKU',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 4: Mixed products with complex ABC scenario
   */
  async testComplexABCScenario() {
    console.log('\n🔄 TEST 4: Complex ABC Scenario (3+ Shipping Outcomes)');
    
    const user = TEST_USERS[0];
    const handgun = REAL_INVENTORY_ITEMS[0]; // Glock 19 (In-House)
    const rifle = REAL_INVENTORY_ITEMS[4]; // Ruger 10/22 (Drop-Ship-FFL)
    const magazine = REAL_INVENTORY_ITEMS[2]; // PMAG (Drop-Ship-Customer)
    
    const testOrder = {
      userId: user.id,
      customerEmail: user.email,
      customerName: user.name,
      membershipTier: user.tier,
      orderItems: [
        {
          ...handgun,
          quantity: 1,
          totalPrice: handgun.unitPrice,
          shippingOutcome: 'In-House'
        },
        {
          ...rifle,
          quantity: 1,
          totalPrice: rifle.unitPrice,
          shippingOutcome: 'Drop-Ship-FFL'
        },
        {
          ...magazine,
          quantity: 5,
          totalPrice: magazine.unitPrice * 5,
          shippingOutcome: 'Drop-Ship-Customer'
        }
      ],
      totalAmount: handgun.unitPrice + rifle.unitPrice + (magazine.unitPrice * 5),
      testType: 'complex-abc',
      shippingOutcomes: [
        {
          type: 'In-House',
          orderItems: [handgun.sku]
        },
        {
          type: 'Drop-Ship-FFL',
          fflDealerName: user.ffl,
          orderItems: [rifle.sku]
        },
        {
          type: 'Drop-Ship-Customer',
          customerAddress: '456 Oak Ave, Somewhere, ST 67890',
          orderItems: [magazine.sku]
        }
      ]
    };

    try {
      console.log('  📋 Creating complex ABC order with SKUs:', 
        testOrder.orderItems.map(i => i.sku).join(', '));
      console.log('  🎯 Expected deal names: TGF-XXXXXX-AZ, TGF-XXXXXX-BZ, TGF-XXXXXX-CZ');
      
      // Submit test order
      const response = await fetch(`${this.baseUrl}/api/test-zoho-integration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });

      const result = await response.json();
      
      console.log('  ✅ Complex ABC test result:', {
        success: result.success,
        dealsCreated: result.deals ? result.deals.length : 0,
        dealNames: result.deals ? result.deals.map(d => d.dealName) : [],
        productsCreated: result.productsCreated
      });

      // Verify all ABC deal names
      if (result.deals && result.deals.length === 3) {
        const patterns = [
          /^TGF-\d{7}-AZ$/,
          /^TGF-\d{7}-BZ$/,
          /^TGF-\d{7}-CZ$/
        ];
        
        const validations = result.deals.map((deal, i) => ({
          name: deal.dealName,
          valid: patterns[i].test(deal.dealName),
          expected: `TGF-XXXXXXX-${String.fromCharCode(65 + i)}Z`
        }));
        
        console.log('  🔍 ABC deal names validation:', validations);

        this.testResults.push({
          test: 'Complex ABC',
          success: result.success && validations.every(v => v.valid),
          dealNames: result.deals.map(d => d.dealName),
          productsCreated: result.productsCreated
        });
      }

      return result;

    } catch (error) {
      console.error('  ❌ Complex ABC test error:', error);
      this.testResults.push({
        test: 'Complex ABC',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 COMPREHENSIVE ZOHO INTEGRATION TESTING');
    console.log('Real Inventory + Dynamic Product Lookup + ABC Deal Naming');
    console.log('================================================================================');
    
    try {
      // Test 1: Single receiver
      await this.testSingleReceiverOrder();
      
      // Test 2: Multi receiver  
      await this.testMultiReceiverOrder();
      
      // Test 3: Duplicate SKU handling
      await this.testDuplicateSKUHandling();
      
      // Test 4: Complex ABC scenario
      await this.testComplexABCScenario();

      // Final summary
      console.log('\n📊 FINAL TEST RESULTS SUMMARY');
      console.log('================================================================================');
      
      this.testResults.forEach(result => {
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} ${result.test}:`, {
          dealName: result.dealName || result.dealNames,
          productsCreated: result.productsCreated,
          error: result.error
        });
      });

      const totalPassed = this.testResults.filter(r => r.success).length;
      const totalTests = this.testResults.length;
      
      console.log(`\n🏆 OVERALL RESULTS: ${totalPassed}/${totalTests} tests passed`);
      console.log('🧠 Dynamic Product Lookup: SKUs should be in Zoho Products module');
      console.log('📈 ABC Deal Naming: Deals should follow TGF-XXXXXXX-[0|AZ|BZ|CZ] pattern');

      return {
        totalTests,
        totalPassed,
        success: totalPassed === totalTests,
        results: this.testResults
      };

    } catch (error) {
      console.error('❌ Test suite error:', error);
      return { error: error.message };
    }
  }
}

// Run the tests
console.log('🔥 Starting Zoho Integration Tests with Real Inventory...');
const tester = new ZohoIntegrationTester();
tester.runAllTests().then(results => {
  console.log('\n🏁 ALL TESTS COMPLETED');
  if (results.success) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL - Ready for production!');
  } else {
    console.log('⚠️  Some tests failed - Review results above');
  }
  process.exit(results.success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});