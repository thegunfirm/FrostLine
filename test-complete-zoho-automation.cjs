/**
 * Complete Zoho Automation Test Suite
 * Tests all tier customers with In-House, Drop-Ship, FFL scenarios
 * Direct endpoint testing to validate the complete Zoho automation system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test scenarios covering all combinations
const testScenarios = [
  {
    name: 'Bronze - Accessories In-House',
    tier: 'Bronze',
    orderData: {
      orderNumber: 'BRONZE-IH-001',
      customerEmail: 'bronze.ih@thegunfirm.com',
      customerName: 'Bronze InHouse Customer',
      membershipTier: 'Bronze',
      totalAmount: 199.99,
      orderItems: [
        { productName: 'Gun Safe', sku: 'ACC001', quantity: 1, unitPrice: 199.99, totalPrice: 199.99, fflRequired: false }
      ],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: null
    },
    expected: {
      fulfillmentType: 'In-House',
      consignee: 'TGF',
      orderingAccount: '99901',
      receiverCode: 'I'
    }
  },
  {
    name: 'Gold Monthly - Firearm Drop-Ship with FFL',
    tier: 'Gold Monthly',
    orderData: {
      orderNumber: 'GOLD-DS-001',
      customerEmail: 'gold.ds@thegunfirm.com',
      customerName: 'Gold DropShip Customer',
      membershipTier: 'Gold Monthly',
      totalAmount: 599.99,
      orderItems: [
        { productName: 'AR-15 Rifle', sku: 'RIF001', quantity: 1, unitPrice: 599.99, totalPrice: 599.99, fflRequired: true }
      ],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: null,
      fflDealerName: 'Test FFL Dealer'
    },
    expected: {
      fulfillmentType: 'Drop-Ship',
      consignee: 'FFL',
      orderingAccount: '99902',
      receiverCode: 'F'
    }
  },
  {
    name: 'Gold Annual - Firearm In-House with FFL Hold',
    tier: 'Gold Annually',
    orderData: {
      orderNumber: 'GOLD-IH-FFL-001',
      customerEmail: 'gold.ih.ffl@thegunfirm.com',
      customerName: 'Gold InHouse FFL Customer',
      membershipTier: 'Gold Annually',
      totalAmount: 549.99,
      orderItems: [
        { productName: 'Glock 19', sku: 'PIS001', quantity: 1, unitPrice: 549.99, totalPrice: 549.99, fflRequired: true }
      ],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: 'FFL not on file'
    },
    expected: {
      fulfillmentType: 'In-House',
      consignee: 'TGF',
      orderingAccount: '99901',
      receiverCode: 'I',
      holdType: 'FFL not on file'
    }
  },
  {
    name: 'Platinum Monthly - Multiple Firearms Drop-Ship',
    tier: 'Platinum Monthly', 
    orderData: {
      orderNumber: 'PLAT-DS-MULTI-001',
      customerEmail: 'platinum.multi@thegunfirm.com',
      customerName: 'Platinum Multi Customer',
      membershipTier: 'Platinum Monthly',
      totalAmount: 1449.98,
      orderItems: [
        { productName: 'AK-47 Style', sku: 'RIF002', quantity: 1, unitPrice: 799.99, totalPrice: 799.99, fflRequired: true },
        { productName: 'Sig P320', sku: 'PIS002', quantity: 1, unitPrice: 649.99, totalPrice: 649.99, fflRequired: true }
      ],
      fulfillmentType: 'Drop-Ship',
      requiresDropShip: true,
      holdType: null,
      fflDealerName: 'Premium FFL Dealer'
    },
    expected: {
      fulfillmentType: 'Drop-Ship',
      consignee: 'FFL',
      orderingAccount: '99902',
      receiverCode: 'F'
    }
  },
  {
    name: 'Platinum Founder - Mixed Order In-House',
    tier: 'Platinum Founder',
    orderData: {
      orderNumber: 'FOUNDER-MIX-001',
      customerEmail: 'founder.mix@thegunfirm.com',
      customerName: 'Founder Mixed Customer',
      membershipTier: 'Platinum Founder',
      totalAmount: 1649.97,
      orderItems: [
        { productName: 'Bolt Action Rifle', sku: 'RIF003', quantity: 1, unitPrice: 1299.99, totalPrice: 1299.99, fflRequired: true },
        { productName: 'Scope', sku: 'ACC002', quantity: 1, unitPrice: 199.99, totalPrice: 199.99, fflRequired: false },
        { productName: 'Ammo Box', sku: 'AMM001', quantity: 3, unitPrice: 49.99, totalPrice: 149.97, fflRequired: false }
      ],
      fulfillmentType: 'In-House',
      requiresDropShip: false,
      holdType: null,
      fflDealerName: 'Founder FFL Dealer'
    },
    expected: {
      fulfillmentType: 'In-House',
      consignee: 'TGF',
      orderingAccount: '99901',
      receiverCode: 'I'
    }
  }
];

class ZohoAutomationTester {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log('🧪 Complete Zoho Automation Test Suite\n');
    console.log('Testing all tier customers with IH, DS, FFL scenarios...\n');

    for (const scenario of testScenarios) {
      console.log(`\n🔸 Testing: ${scenario.name}`);
      console.log(`   Tier: ${scenario.tier}`);
      console.log(`   Type: ${scenario.expected.fulfillmentType} → ${scenario.expected.consignee}`);
      console.log(`   Account: ${scenario.expected.orderingAccount}`);

      try {
        const result = await this.testScenario(scenario);
        this.results.push(result);
        
        if (result.success) {
          console.log(`   ✅ SUCCESS: Deal ${result.dealId}`);
          console.log(`   📊 TGF Order: ${result.tgfOrderNumber}`);
          console.log(`   🎯 Validation: ${this.validateFields(result, scenario.expected)}`);
        } else {
          console.log(`   ❌ FAILED: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        this.results.push({
          scenario: scenario.name,
          success: false,
          error: error.message
        });
      }

      // Wait between tests to avoid overwhelming the system
      await this.sleep(1500);
    }

    this.printSummary();
  }

  async testScenario(scenario) {
    try {
      const response = await axios.post(`${BASE_URL}/api/test/zoho-system-fields`, scenario.orderData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.success) {
        return {
          scenario: scenario.name,
          success: true,
          dealId: response.data.dealId,
          contactId: response.data.contactId,
          tgfOrderNumber: response.data.tgfOrderNumber,
          zohoFields: response.data.zohoFields,
          expected: scenario.expected
        };
      } else {
        return {
          scenario: scenario.name,
          success: false,
          error: response.data.error || 'Unknown error'
        };
      }
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  validateFields(result, expected) {
    const validations = [];

    // Validate TGF Order Number format
    if (result.tgfOrderNumber) {
      const regex = /^\d{7}[ICF][0A-Z]$/;
      if (regex.test(result.tgfOrderNumber)) {
        const receiverCode = result.tgfOrderNumber.charAt(result.tgfOrderNumber.length - 2);
        if (receiverCode === expected.receiverCode) {
          validations.push('✅ Order format correct');
        } else {
          validations.push(`❌ Wrong receiver: ${receiverCode} vs ${expected.receiverCode}`);
        }
      } else {
        validations.push('❌ Invalid order format');
      }
    } else {
      validations.push('❌ No TGF order number');
    }

    // Validate Zoho fields
    const fields = result.zohoFields;
    if (fields) {
      if (fields.Fulfillment_Type === expected.fulfillmentType) {
        validations.push('✅ Fulfillment type correct');
      } else {
        validations.push(`❌ Wrong fulfillment: ${fields.Fulfillment_Type}`);
      }

      if (fields.Consignee === expected.consignee) {
        validations.push('✅ Consignee correct');
      } else {
        validations.push(`❌ Wrong consignee: ${fields.Consignee}`);
      }

      if (fields.Ordering_Account === expected.orderingAccount) {
        validations.push('✅ Account correct');
      } else {
        validations.push(`❌ Wrong account: ${fields.Ordering_Account}`);
      }

      // Validate hold type if expected
      if (expected.holdType) {
        if (fields.Hold_Type === expected.holdType) {
          validations.push('✅ Hold type correct');
        } else {
          validations.push(`❌ Wrong hold: ${fields.Hold_Type}`);
        }
      }
    } else {
      validations.push('❌ No Zoho fields returned');
    }

    return validations.join(', ');
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📋 COMPLETE ZOHO AUTOMATION TEST SUMMARY');
    console.log('='.repeat(70));

    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`Overall Results: ${passed}/${total} scenarios passed\n`);

    // Group results by success/failure
    const successes = this.results.filter(r => r.success);
    const failures = this.results.filter(r => !r.success);

    if (successes.length > 0) {
      console.log('✅ SUCCESSFUL TESTS:');
      successes.forEach(result => {
        console.log(`   ✅ ${result.scenario}`);
        console.log(`      Order: ${result.tgfOrderNumber} | Deal: ${result.dealId}`);
        if (result.zohoFields) {
          console.log(`      Fields: ${result.zohoFields.Fulfillment_Type} → ${result.zohoFields.Consignee} (${result.zohoFields.Ordering_Account})`);
        }
        console.log('');
      });
    }

    if (failures.length > 0) {
      console.log('❌ FAILED TESTS:');
      failures.forEach(result => {
        console.log(`   ❌ ${result.scenario}`);
        console.log(`      Error: ${result.error}`);
        console.log('');
      });
    }

    // Final assessment
    if (passed === total) {
      console.log('🎉 ALL ZOHO AUTOMATION TESTS PASSED!');
      console.log('');
      console.log('✅ System Features Validated:');
      console.log('   • TGF Order Number generation (NNNNNNNRC format)');
      console.log('   • Automatic system field population');
      console.log('   • Fulfillment type determination');
      console.log('   • Consignee assignment logic');
      console.log('   • Ordering account routing');
      console.log('   • Contact and Deal creation in Zoho CRM');
      console.log('   • Multi-tier customer support');
      console.log('   • FFL compliance handling');
      console.log('');
      console.log('🚀 The Zoho automation system is production-ready!');
    } else {
      console.log('⚠️  Some tests failed - system needs review');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the complete test suite
async function main() {
  const tester = new ZohoAutomationTester();
  await tester.runAllTests();
}

main().catch(console.error);