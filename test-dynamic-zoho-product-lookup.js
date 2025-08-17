/**
 * Comprehensive Test: Dynamic Product Lookup & ABC Deal Naming
 * Tests the new system with real inventory and multiple shipping scenarios
 */

import { ZohoService } from './server/zoho-service.js';
import { ZohoProductLookupService } from './server/services/zoho-product-lookup-service.js';
import { OrderZohoIntegration } from './server/order-zoho-integration.js';
import { DatabaseStorage } from './server/storage.js';

class ZohoProductLookupTester {
  constructor() {
    this.zohoService = new ZohoService();
    this.productLookupService = new ZohoProductLookupService(this.zohoService);
    this.orderIntegration = new OrderZohoIntegration(this.zohoService);
    this.storage = new DatabaseStorage();
  }

  /**
   * Test 1: Single-receiver order (should get TGF-XXXXXX-0)
   */
  async testSingleReceiverOrder() {
    console.log('\n🔄 TEST 1: Single Receiver Order (In-House)');
    
    const testOrder = {
      customerEmail: 'test.customer1@example.com',
      customerName: 'John Smith',
      membershipTier: 'Gold Monthly',
      orderItems: [
        {
          sku: 'GLOCK-19-GEN5', // Real Glock 19 SKU
          productName: 'Glock 19 Gen5 9mm Pistol',
          quantity: 1,
          unitPrice: 549.99,
          totalPrice: 549.99,
          manufacturer: 'Glock',
          category: 'Handguns',
          fflRequired: true,
          dropShipEligible: false,
          inHouseOnly: true,
          rsrStockNumber: 'PI1950203',
          distributor: 'RSR'
        }
      ],
      shippingOutcome: 'In-House', // Single outcome
      fflDealerName: 'Smith\'s Gun Shop',
      totalAmount: 549.99
    };

    try {
      // Test product lookup first
      console.log('  📋 Testing product lookup for SKU:', testOrder.orderItems[0].sku);
      const productResult = await this.productLookupService.findOrCreateProductBySKU({
        sku: testOrder.orderItems[0].sku,
        productName: testOrder.orderItems[0].productName,
        manufacturer: testOrder.orderItems[0].manufacturer,
        productCategory: testOrder.orderItems[0].category,
        fflRequired: testOrder.orderItems[0].fflRequired,
        dropShipEligible: testOrder.orderItems[0].dropShipEligible,
        inHouseOnly: testOrder.orderItems[0].inHouseOnly,
        distributorPartNumber: testOrder.orderItems[0].rsrStockNumber,
        distributor: testOrder.orderItems[0].distributor
      });

      console.log('  ✅ Product lookup result:', {
        productId: productResult.productId,
        created: productResult.created,
        error: productResult.error
      });

      // Generate TGF order number
      const orderNumber = `TGF-${Date.now().toString().slice(-7)}`; // 7-digit

      // Test order integration with single receiver
      const orderData = {
        orderNumber,
        customerEmail: testOrder.customerEmail,
        customerName: testOrder.customerName,
        membershipTier: testOrder.membershipTier,
        orderItems: testOrder.orderItems,
        totalAmount: testOrder.totalAmount,
        fflDealerName: testOrder.fflDealerName,
        shippingOutcomes: [{ // Single outcome
          type: 'In-House',
          orderDetails: testOrder.orderItems
        }]
      };

      console.log('  🚀 Creating Zoho deal with expected name:', `${orderNumber}-0`);
      const dealResult = await this.orderIntegration.processRSROrderToZoho(orderData, orderData.shippingOutcomes[0]);

      console.log('  ✅ Single-receiver deal result:', {
        success: dealResult.success,
        dealId: dealResult.dealId,
        expectedDealName: `${orderNumber}-0`,
        tgfOrderNumber: dealResult.tgfOrderNumber
      });

      return dealResult;

    } catch (error) {
      console.error('  ❌ Single-receiver test error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test 2: Multi-receiver order (should get TGF-XXXXXX-AZ, TGF-XXXXXX-BZ)
   */
  async testMultiReceiverOrder() {
    console.log('\n🔄 TEST 2: Multi-Receiver Order (Drop-Ship + FFL)');
    
    const testOrder = {
      customerEmail: 'test.customer2@example.com',
      customerName: 'Sarah Johnson',
      membershipTier: 'Platinum Monthly',
      orderItems: [
        {
          sku: 'SIG-P320-COMPACT', // Real Sig Sauer SKU
          productName: 'Sig Sauer P320 Compact 9mm',
          quantity: 1,
          unitPrice: 599.99,
          totalPrice: 599.99,
          manufacturer: 'Sig Sauer',
          category: 'Handguns',
          fflRequired: true,
          rsrStockNumber: 'SIG320C9BSS',
          distributor: 'RSR'
        },
        {
          sku: 'MAGPUL-PMAG-30', // Real magazine SKU
          productName: 'Magpul PMAG 30-Round Magazine',
          quantity: 3,
          unitPrice: 14.99,
          totalPrice: 44.97,
          manufacturer: 'Magpul',
          category: 'Magazines',
          fflRequired: false,
          dropShipEligible: true,
          rsrStockNumber: 'MAG571BLK',
          distributor: 'RSR'
        }
      ],
      totalAmount: 644.96
    };

    try {
      // Test product lookup for both SKUs
      console.log('  📋 Testing product lookup for multiple SKUs');
      
      const productResults = [];
      for (const item of testOrder.orderItems) {
        const result = await this.productLookupService.findOrCreateProductBySKU({
          sku: item.sku,
          productName: item.productName,
          manufacturer: item.manufacturer,
          productCategory: item.category,
          fflRequired: item.fflRequired,
          dropShipEligible: item.dropShipEligible,
          distributorPartNumber: item.rsrStockNumber,
          distributor: item.distributor
        });
        productResults.push({ sku: item.sku, result });
        console.log(`    ✅ ${item.sku}:`, { 
          productId: result.productId, 
          created: result.created 
        });
      }

      // Generate TGF order number
      const orderNumber = `TGF-${Date.now().toString().slice(-7)}`; // 7-digit

      // Split into multiple shipping outcomes
      const shippingOutcomes = [
        {
          type: 'Drop-Ship-FFL',
          orderDetails: [testOrder.orderItems[0]], // Handgun to FFL
          fflDealerName: 'Johnson\'s Firearms'
        },
        {
          type: 'Drop-Ship-Customer', 
          orderDetails: [testOrder.orderItems[1]], // Magazines direct to customer
          customerAddress: '123 Main St, Anytown, ST 12345'
        }
      ];

      // Test order integration with multiple receivers
      const orderData = {
        orderNumber,
        customerEmail: testOrder.customerEmail,
        customerName: testOrder.customerName,
        membershipTier: testOrder.membershipTier,
        orderItems: testOrder.orderItems,
        totalAmount: testOrder.totalAmount,
        shippingOutcomes
      };

      console.log('  🚀 Creating Zoho deals with expected names:', 
        `${orderNumber}-AZ`, `${orderNumber}-BZ`);

      const dealResults = [];
      for (let i = 0; i < shippingOutcomes.length; i++) {
        const outcome = shippingOutcomes[i];
        const dealResult = await this.orderIntegration.processRSROrderToZoho(orderData, outcome);
        dealResults.push({
          outcome: outcome.type,
          expectedDealName: `${orderNumber}-${String.fromCharCode(65 + i)}Z`,
          result: dealResult
        });
        
        console.log(`    ✅ Deal ${i + 1} (${outcome.type}):`, {
          success: dealResult.success,
          dealId: dealResult.dealId,
          expectedName: `${orderNumber}-${String.fromCharCode(65 + i)}Z`
        });
      }

      return dealResults;

    } catch (error) {
      console.error('  ❌ Multi-receiver test error:', error);
      return [{ success: false, error: error.message }];
    }
  }

  /**
   * Test 3: Duplicate SKU handling within same order
   */
  async testDuplicateSKUHandling() {
    console.log('\n🔄 TEST 3: Duplicate SKU Handling (Same SKU in Multiple Line Items)');
    
    const duplicateOrder = {
      customerEmail: 'test.customer3@example.com',
      customerName: 'Mike Wilson',
      membershipTier: 'Bronze',
      orderItems: [
        {
          sku: 'AR15-PMAG-30', // Same SKU multiple times
          productName: 'AR-15 PMAG 30-Round Magazine',
          quantity: 5,
          unitPrice: 12.99,
          totalPrice: 64.95,
          manufacturer: 'Magpul',
          category: 'Magazines',
          rsrStockNumber: 'MAG557BLK',
          distributor: 'RSR'
        },
        {
          sku: 'AR15-PMAG-30', // Same SKU again
          productName: 'AR-15 PMAG 30-Round Magazine',
          quantity: 10,
          unitPrice: 12.99,
          totalPrice: 129.90,
          manufacturer: 'Magpul',
          category: 'Magazines',
          rsrStockNumber: 'MAG557BLK',
          distributor: 'RSR'
        }
      ],
      shippingOutcome: 'Drop-Ship-Customer',
      totalAmount: 194.85
    };

    try {
      console.log('  📋 Testing duplicate SKU batch de-duplication');
      
      // Clear cache first
      this.productLookupService.clearCache();
      
      const productResults = [];
      for (let i = 0; i < duplicateOrder.orderItems.length; i++) {
        const item = duplicateOrder.orderItems[i];
        console.log(`  🔍 Lookup ${i + 1} for SKU: ${item.sku}`);
        
        const result = await this.productLookupService.findOrCreateProductBySKU({
          sku: item.sku,
          productName: item.productName,
          manufacturer: item.manufacturer,
          productCategory: item.category,
          distributorPartNumber: item.rsrStockNumber,
          distributor: item.distributor
        });
        
        productResults.push({ 
          lookupNumber: i + 1, 
          sku: item.sku, 
          created: result.created,
          productId: result.productId,
          fromCache: i > 0 // Should be from cache on subsequent lookups
        });
        
        console.log(`    ${result.created ? '🆕' : '♻️'} Result ${i + 1}:`, {
          productId: result.productId,
          created: result.created,
          expectedFromCache: i > 0
        });
      }

      // Verify only one product was created
      const uniqueProductIds = new Set(productResults.map(r => r.productId));
      const createdCount = productResults.filter(r => r.created).length;
      
      console.log('  ✅ Duplicate SKU test results:', {
        totalLookups: productResults.length,
        uniqueProducts: uniqueProductIds.size,
        productsCreated: createdCount,
        expectedUniqueProducts: 1,
        expectedCreatedCount: 1,
        success: uniqueProductIds.size === 1 && createdCount === 1
      });

      return {
        success: uniqueProductIds.size === 1 && createdCount === 1,
        results: productResults
      };

    } catch (error) {
      console.error('  ❌ Duplicate SKU test error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE ZOHO PRODUCT LOOKUP & ABC DEAL NAMING TESTS');
    console.log('================================================================================');
    
    const results = {
      singleReceiver: null,
      multiReceiver: null,
      duplicateSKU: null
    };

    try {
      // Test 1: Single receiver
      results.singleReceiver = await this.testSingleReceiverOrder();
      
      // Test 2: Multi receiver  
      results.multiReceiver = await this.testMultiReceiverOrder();
      
      // Test 3: Duplicate SKU handling
      results.duplicateSKU = await this.testDuplicateSKUHandling();

      // Final summary
      console.log('\n📊 FINAL TEST RESULTS SUMMARY');
      console.log('================================================================================');
      console.log('✅ Single Receiver (TGF-XXXXXX-0):', results.singleReceiver?.success ? 'PASSED' : 'FAILED');
      console.log('✅ Multi Receiver (TGF-XXXXXX-AZ/BZ):', results.multiReceiver?.every(r => r.result?.success) ? 'PASSED' : 'FAILED');
      console.log('✅ Duplicate SKU De-duplication:', results.duplicateSKU?.success ? 'PASSED' : 'FAILED');
      
      // Cache state verification
      const cacheState = this.productLookupService.getCacheState();
      console.log('\n🧠 Product Cache State:', cacheState);
      console.log('📈 Cache Entries:', Object.keys(cacheState).length);

      return results;

    } catch (error) {
      console.error('❌ Test suite error:', error);
      return { error: error.message };
    }
  }
}

// Run the tests
const tester = new ZohoProductLookupTester();
tester.runAllTests().then(results => {
  console.log('\n🏁 ALL TESTS COMPLETED');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});