import { ZohoService } from './zoho-service';
import { zohoOrderFieldsService, type ZohoOrderFieldMapping, type ZohoProductFieldMapping } from './services/zoho-order-fields-service';
import { getZohoRateLimitedService } from './services/zoho-rate-limited-service';
import { productLookupService } from './services/product-lookup-service';

export interface OrderToZohoData {
  orderNumber: string;
  totalAmount: number;
  customerEmail: string;
  customerName: string;
  membershipTier: string;
  orderItems: Array<{
    productName: string;
    sku: string;
    rsrStockNumber?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    fflRequired?: boolean;
  }>;
  fflDealerName?: string;
  orderStatus: string;
  zohoContactId?: string;
  // New RSR-specific fields
  fulfillmentType?: 'In-House' | 'Drop-Ship';
  orderingAccount?: '99901' | '99902' | '63824' | '60742';
  requiresDropShip?: boolean;
  holdType?: 'FFL not on file' | 'Gun Count Rule';
  engineResponse?: any;
  isTestOrder?: boolean;
}

/**
 * Service to handle integration between TheGunFirm orders and Zoho CRM deals
 */
export class OrderZohoIntegration {
  private zohoService: ZohoService;

  constructor() {
    this.zohoService = new ZohoService({
      clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID!,
      clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET!,
      redirectUri: "https://thegunfirm.com/api/zoho/callback",
      accountsHost: 'https://accounts.zoho.com',
      apiHost: 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
    });
  }

  /**
   * Get the configured ZohoService instance
   */
  getZohoService(): ZohoService {
    return this.zohoService;
  }

  /**
   * Create a product using the rate-limited service
   */
  async createProduct(sku: string, productData: any): Promise<string | null> {
    try {
      const rateLimitedService = getZohoRateLimitedService();
      
      const productPayload = {
        Product_Name: productData.productName || sku,
        Mfg_Part_Number: sku, // CORRECTED: Using working field for manufacturer part number
        ...(productData.manufacturer && { Manufacturer: productData.manufacturer }),
        ...(productData.category && { Product_Category: productData.category }),
        ...(productData.fflRequired !== undefined && { FFL_Required: productData.fflRequired }),
        ...(productData.dropShipEligible !== undefined && { Drop_Ship_Eligible: productData.dropShipEligible }),
        ...(productData.inHouseOnly !== undefined && { In_House_Only: productData.inHouseOnly }),
        ...(productData.rsrStockNumber && { RSR_Stock_Number: productData.rsrStockNumber }), // CORRECTED: Using working field
        ...(productData.distributor && { Distributor: productData.distributor }),
        ...(productData.upcCode && { UPC_EAN: productData.upcCode }), // UPC field mapping for product module
        // Additional fields per spec
        ...(productData.specifications && { Product_Specifications: productData.specifications }),
        ...(productData.images && { Product_Images: productData.images })
      };

      console.log(`🔍 Using rate-limited upsert for product SKU: ${sku}`);
      
      const result = await rateLimitedService.upsertProductSafe(productPayload);
      
      if (result?.id) {
        console.log(`✅ Product upserted ${sku} with ID: ${result.id}`);
        return result.id;
      } else {
        console.log(`❌ Product upsert failed: ${JSON.stringify(result)}`);
        return null;
      }

    } catch (error: any) {
      console.error('Product creation error:', error);
      
      // If it's a duplicate error, try to find the existing product
      if (error.response?.data?.data?.[0]?.code === 'DUPLICATE_DATA') {
        console.log(`🔄 Duplicate product found for SKU ${sku}, searching for existing...`);
        try {
          const searchResult = await this.zohoService.searchRecords('Products', `(Product_Name:equals:${sku})`);
          if (searchResult?.data?.length > 0) {
            console.log(`✅ Found existing product: ${searchResult.data[0].id}`);
            return searchResult.data[0].id;
          }
        } catch (searchError) {
          console.error('Error searching for existing product:', searchError);
        }
      }
      
      return null;
    }
  }

  /**
   * Create or update a Zoho Deal with comprehensive RSR field mapping
   */
  async processOrderWithRSRFields(orderData: OrderToZohoData): Promise<{
    success: boolean;
    dealId?: string;
    tgfOrderNumber?: string;
    zohoFields?: ZohoOrderFieldMapping;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing RSR order ${orderData.orderNumber} with comprehensive field mapping...`);

      // 1. Get next sequential order number
      const baseOrderNumber = await zohoOrderFieldsService.getNextOrderNumber(orderData.isTestOrder);
      
      // 2. Determine order characteristics
      const fulfillmentType = orderData.fulfillmentType || 
        zohoOrderFieldsService.determineFulfillmentType(
          orderData.orderingAccount || '99901', 
          orderData.requiresDropShip || false
        );
      
      const requiresFFL = orderData.orderItems.some(item => item.fflRequired);
      const consignee = zohoOrderFieldsService.determineConsignee(fulfillmentType, requiresFFL);
      
      // 3. Build comprehensive Zoho field mapping
      const zohoFields = zohoOrderFieldsService.buildOrderFieldMapping({
        orderNumber: orderData.orderNumber,
        baseOrderNumber,
        fulfillmentType,
        orderingAccount: orderData.orderingAccount || '99901',
        consignee,
        requiresFFL,
        isTest: orderData.isTestOrder || false,
        holdType: orderData.holdType,
        appStatus: orderData.engineResponse ? 'Engine Submitted' : 'Submitted'
      });

      // 4. Update fields based on Engine response if available
      if (orderData.engineResponse) {
        const updatedFields = zohoOrderFieldsService.updateOrderStatusFromEngineResponse(
          zohoFields,
          orderData.engineResponse
        );
        Object.assign(zohoFields, updatedFields);
      }

      // 5. Find or create customer contact
      let contactId = orderData.zohoContactId;
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
        } else {
          const nameParts = orderData.customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const rateLimitedService = getZohoRateLimitedService();
          const newContact = await rateLimitedService.createContactSafe({
            Email: orderData.customerEmail,
            First_Name: firstName,
            Last_Name: lastName,
            Lead_Source: 'TheGunFirm.com',
            Description: JSON.stringify({
              membershipTier: orderData.membershipTier,
              accountType: 'Customer',
              createdFrom: 'RSR Order Processing'
            })
          });
          contactId = newContact?.data?.[0]?.details?.id || newContact?.id;
        }
      }

      // 6. Map product information to Zoho fields
      let productFields: ZohoProductFieldMapping;
      if (orderData.orderItems.length === 1) {
        // Single product order
        const product = orderData.orderItems[0];
        productFields = zohoOrderFieldsService.mapProductToZohoDeal(product, orderData.totalAmount);
      } else {
        // Multiple product order - create "Mixed Order" summary
        productFields = zohoOrderFieldsService.mapMultipleProductsToZohoDeal(orderData.orderItems, orderData.totalAmount);
      }

      // Validate product fields
      const validation = zohoOrderFieldsService.validateProductFields(productFields);
      if (!validation.valid) {
        console.warn(`⚠️ Product field validation warnings: ${validation.errors.join(', ')}`);
      }

      // 7. Create deal name using proper specification
      const isMultipleGroups = false; // Single group for now - multi-group logic to be implemented
      const dealName = zohoOrderFieldsService.buildDealName(
        baseOrderNumber,
        false, // Always use production format - no "test" prefix
        isMultipleGroups
      );
      
      // 8. Create Zoho Deal with comprehensive RSR fields and product information
      const dealData = {
        // Product Information (overrides Deal_Name and Amount from productFields)
        Deal_Name: dealName,
        Contact_Name: contactId,
        Amount: productFields.Amount,
        Stage: this.mapOrderStatusToStage(zohoFields.Order_Status),
        
        // Product-specific fields (updated field names)
        'Product Code (SKU)': productFields['Product Code (SKU)'],
        'Distributor Part Number': productFields['Distributor Part Number'],
        Distributor: productFields.Distributor,
        Quantity: productFields.Quantity,
        'Unit Price': productFields['Unit Price'],
        'Product Category': productFields['Product Category'],
        Manufacturer: productFields.Manufacturer,
        'FFL Required': productFields['FFL Required'],
        'Drop Ship Eligible': productFields['Drop Ship Eligible'],
        'In House Only': productFields['In House Only'],
        
        // RSR-specific system fields
        TGF_Order: zohoFields.TGF_Order,
        Fulfillment_Type: zohoFields.Fulfillment_Type,
        Flow: zohoFields.Flow,
        Order_Status: zohoFields.Order_Status,
        Consignee: zohoFields.Consignee,
        Ordering_Account: zohoFields.Ordering_Account,
        Hold_Type: zohoFields.Hold_Type,
        APP_Status: zohoFields.APP_Status,
        Carrier: zohoFields.Carrier,
        Tracking_Number: zohoFields.Tracking_Number,
        Estimated_Ship_Date: zohoFields.Estimated_Ship_Date,
        Submitted: zohoFields.Submitted,
        APP_Confirmed: zohoFields.APP_Confirmed,
        Last_Distributor_Update: zohoFields.Last_Distributor_Update,
        
        // Additional context
        Description: JSON.stringify({
          originalOrderNumber: orderData.orderNumber,
          membershipTier: orderData.membershipTier,
          fflDealer: orderData.fflDealerName,
          itemCount: orderData.orderItems.length,
          engineResponse: orderData.engineResponse ? 'Engine processed' : 'Local order'
        })
      };

      const rateLimitedService = getZohoRateLimitedService();
      const dealResult = await rateLimitedService.createDealSafe({
        contactId: contactId || '',
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        orderItems: orderData.orderItems,
        membershipTier: orderData.membershipTier,
        fflRequired: requiresFFL,
        fflDealerName: orderData.fflDealerName,
        orderStatus: zohoFields.Order_Status || 'Submitted',
        systemFields: dealData
      });

      if (dealResult.success) {
        console.log(`✅ Created RSR deal ${dealResult.dealId} with order number ${zohoFields.TGF_Order}`);
        
        // Start confirmation loop - verify order processing and update APP_Confirmed
        console.log(`🔄 Triggering confirmation loop for deal ${dealResult.dealId}`);
        this.startConfirmationLoop(dealResult.dealId, zohoFields);
        
        return {
          success: true,
          dealId: dealResult.dealId,
          tgfOrderNumber: zohoFields.TGF_Order || '',
          zohoFields
        };
      } else {
        console.error(`❌ Failed to create RSR deal: ${dealResult.error}`);
        return {
          success: false,
          error: dealResult.error
        };
      }

    } catch (error: any) {
      console.error('RSR order-to-Zoho integration error:', error);
      return {
        success: false,
        error: `RSR integration error: ${error.message}`
      };
    }
  }

  /**
   * Start confirmation loop - verifies the deal was created properly and updates APP_Confirmed
   */
  private async startConfirmationLoop(
    dealId: string, 
    initialFields: ZohoOrderFieldMapping
  ): Promise<void> {
    console.log(`🚀 Confirmation loop method called for deal ${dealId}`);
    
    try {
      // Use setImmediate instead of setTimeout for better Node.js compatibility
      setImmediate(async () => {
        try {
          console.log(`🔄 Starting confirmation loop execution for deal ${dealId}...`);
          
          // Wait a moment to ensure Zoho deal is fully created
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log(`🔍 Retrieving deal ${dealId} for verification...`);
          
          // Verify the deal was created successfully by retrieving it from Zoho
          const dealVerification = await this.zohoService.getDealById(dealId);
          
          if (dealVerification && dealVerification.id) {
            console.log(`✅ Deal verification successful: ${dealId}`);
            console.log(`📄 Deal details: Name=${dealVerification.Deal_Name}, Amount=$${dealVerification.Amount}`);
            
            // Check if subform was populated (for orders with line items)
            let subformVerified = true;
            if (dealVerification.Subform_1 && Array.isArray(dealVerification.Subform_1)) {
              subformVerified = dealVerification.Subform_1.length > 0;
              console.log(`📋 Subform verification: ${subformVerified ? 'populated' : 'empty'} (${dealVerification.Subform_1.length} items)`);
            } else {
              console.log(`📋 No subform data found in deal`);
            }
            
            // Create APP confirmation timestamp
            const appConfirmedTime = new Date().toISOString().slice(0, 19); // Zoho format
            console.log(`⏰ Generated APP_Confirmed timestamp: ${appConfirmedTime}`);
            
            // Update the deal with APP_Confirmed success
            console.log(`📝 Updating deal ${dealId} with confirmation fields...`);
            const updateSuccess = await this.updateRSROrderFields(dealId, {
              APP_Status: 'App Processed: Order successfully received and confirmed by TheGunFirm application',
              APP_Confirmed: appConfirmedTime,
              Last_Distributor_Update: appConfirmedTime
            });
            
            if (updateSuccess) {
              console.log(`✅ Confirmation loop completed successfully for deal ${dealId}`);
              console.log(`📅 APP_Confirmed timestamp: ${appConfirmedTime}`);
              console.log(`🔗 Application confirmation: Order verified and processed`);
              
              if (subformVerified) {
                console.log(`📋 Subform confirmed: All product line items properly recorded`);
              }
            } else {
              console.warn(`⚠️ Failed to update APP_Confirmed field for deal ${dealId}`);
            }
            
          } else {
            console.error(`❌ Deal verification failed: Could not retrieve deal ${dealId} from Zoho`);
            console.error(`❌ DealVerification result:`, dealVerification);
            
            // Still try to set APP_Confirmed with error status
            await this.updateRSROrderFields(dealId, {
              APP_Status: 'App Error: Deal created but verification failed',
              APP_Confirmed: new Date().toISOString().slice(0, 19)
            });
          }
          
        } catch (confirmError: any) {
          console.error(`❌ Confirmation loop error for deal ${dealId}:`, confirmError.message);
          console.error(`❌ Error stack:`, confirmError.stack);
          
          // Set APP_Confirmed with error status
          try {
            await this.updateRSROrderFields(dealId, {
              APP_Status: `App Error: Confirmation failed - ${confirmError.message}`,
              APP_Confirmed: new Date().toISOString().slice(0, 19)
            });
          } catch (updateError: any) {
            console.error(`❌ Failed to update error status for deal ${dealId}:`, updateError.message);
          }
        }
      });
      
    } catch (error: any) {
      console.error('Failed to start confirmation loop:', error.message);
    }
  }

  /**
   * Update RSR order fields in existing Zoho deal
   */
  async updateRSROrderFields(
    dealId: string,
    updates: Partial<ZohoOrderFieldMapping>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      // Map updates to Zoho field names
      if (updates.Order_Status) updateData.Order_Status = updates.Order_Status;
      if (updates.APP_Status) updateData.APP_Status = updates.APP_Status;
      if (updates.APP_Response) updateData.APP_Response = updates.APP_Response;
      if (updates.Carrier) updateData.Carrier = updates.Carrier;
      if (updates.Tracking_Number) updateData.Tracking_Number = updates.Tracking_Number;
      if (updates.Estimated_Ship_Date) updateData.Estimated_Ship_Date = updates.Estimated_Ship_Date;
      if (updates.APP_Confirmed) updateData.APP_Confirmed = updates.APP_Confirmed;
      if (updates.Last_Distributor_Update) updateData.Last_Distributor_Update = updates.Last_Distributor_Update;
      
      // Update stage based on order status
      if (updates.Order_Status) {
        updateData.Stage = this.mapOrderStatusToStage(updates.Order_Status);
      }

      // Use the Zoho service to update the deal with all fields
      const result = await this.zohoService.updateDeal(dealId, updateData);
      console.log(`📝 Updated RSR fields for deal ${dealId}: ${result ? 'success' : 'failed'}`);
      
      if (result && updates.APP_Confirmed) {
        console.log(`✅ APP_Confirmed field updated with timestamp: ${updates.APP_Confirmed}`);
      }
      
      return result;

    } catch (error: any) {
      console.error('RSR field update error:', error);
      return false;
    }
  }

  /**
   * Creates Deal name based on TGF order number and receiver grouping
   * @param tgfOrderNumber - The base TGF order number (7-digit)
   * @param totalGroups - Total number of receiver groups
   * @param groupIndex - Current group index (0-based)
   * @returns Deal name with appropriate suffix
   */
  private createDealName(tgfOrderNumber?: string, totalGroups: number = 1, groupIndex: number = 0): string {
    if (!tgfOrderNumber) {
      return totalGroups === 1 ? 'ORDER-0' : `ORDER-${String.fromCharCode(65 + groupIndex)}Z`;
    }
    
    // Extract the 7-digit order number from order format
    const orderNumber = tgfOrderNumber.replace(/^TGF-/, '').replace(/-[ICF]$/, '');
    
    if (totalGroups === 1) {
      // Single receiver: {OrderNo}-0
      return `${orderNumber}-0`;
    } else {
      // Multiple receivers: {OrderNo}-{GroupLetter}Z
      const groupLetter = String.fromCharCode(65 + groupIndex); // A, B, C, ...
      return `${orderNumber}-${groupLetter}Z`;
    }
  }

  /**
   * Map order status to Zoho deal stage
   */
  private mapOrderStatusToStage(orderStatus: string): string {
    const stageMap: Record<string, string> = {
      'Submitted': 'Proposal/Price Quote',
      'Hold': 'Qualification',
      'Confirmed': 'Needs Analysis',
      'Processing': 'Value Proposition',
      'Partially Shipped': 'Id. Decision Makers',
      'Shipped': 'Perception Analysis',
      'Delivered': 'Closed Won',
      'Rejected': 'Closed Lost',
      'Cancelled': 'Closed Lost'
    };
    
    return stageMap[orderStatus] || 'Qualification';
  }

  /**
   * Process order with automatic order splitting based on shipping outcomes
   * Creates separate Zoho deals for each shipping outcome (DS→Customer, DS→FFL, In-House)
   */
  async processOrderWithSplitting(orderData: OrderToZohoData): Promise<{
    success: boolean;
    orders: Array<{
      dealId: string;
      contactId: string;
      tgfOrderNumber: string;
      outcome: string;
      zohoFields: any;
    }>;
    totalOrders: number;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing order ${orderData.orderNumber} with automatic splitting...`);

      // 1. Analyze shipping outcomes from order items
      const shippingOutcomes = zohoOrderFieldsService.analyzeShippingOutcomes(orderData.orderItems);
      console.log(`📦 Detected ${shippingOutcomes.length} shipping outcomes:`, shippingOutcomes.map(o => o.outcome));

      if (shippingOutcomes.length === 0) {
        return {
          success: false,
          orders: [],
          totalOrders: 0,
          error: 'No valid shipping outcomes detected from order items'
        };
      }

      // 2. Generate base order number and split TGF order numbers
      const baseOrderNumber = await zohoOrderFieldsService.getNextOrderNumber(orderData.isTestOrder);
      const tgfOrderNumbers = zohoOrderFieldsService.generateSplitOrderNumbers(
        baseOrderNumber,
        shippingOutcomes,
        orderData.isTestOrder
      );

      console.log(`🏷️ Generated TGF order numbers:`, tgfOrderNumbers);

      // 3. Find or create customer contact
      let contactId = orderData.zohoContactId;
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
          console.log(`✅ Found existing contact: ${contactId}`);
        } else {
          const newContact = await this.zohoService.createContact({
            Email: orderData.customerEmail,
            First_Name: orderData.customerName.split(' ')[0],
            Last_Name: orderData.customerName.split(' ').slice(1).join(' ') || 'Customer',
            Description: `${orderData.membershipTier} - TheGunFirm.com`,
            Lead_Source: 'TheGunFirm.com'
          });
          contactId = newContact.id;
          console.log(`✅ Created new contact: ${contactId}`);
        }
      }

      // 4. Create separate Zoho deals for each shipping outcome
      const createdOrders: Array<{
        dealId: string;
        contactId: string;
        tgfOrderNumber: string;
        outcome: string;
        zohoFields: any;
      }> = [];

      for (let i = 0; i < shippingOutcomes.length; i++) {
        const outcome = shippingOutcomes[i];
        const tgfOrderNumber = tgfOrderNumbers[i];

        console.log(`📝 Creating order ${i + 1}/${shippingOutcomes.length}: ${tgfOrderNumber} (${outcome.outcome})`);

        // Build system field mapping for this specific outcome
        const systemFieldMapping = zohoOrderFieldsService.buildOrderFieldMapping({
          orderNumber: `${orderData.orderNumber}-${outcome.outcome}`,
          baseOrderNumber: undefined, // We already have the TGF order number
          fulfillmentType: outcome.fulfillmentType,
          orderingAccount: outcome.orderingAccount,
          consignee: outcome.consignee,
          requiresFFL: outcome.items.some(item => item.fflRequired),
          isMultipleOrder: shippingOutcomes.length > 1,
          multipleIndex: i,
          isTest: orderData.isTestOrder || false,
          holdType: orderData.holdType as 'FFL not on file' | 'Gun Count Rule' | undefined,
          appTgfOrderNumber: tgfOrderNumber, // Use our generated TGF order number
          appResponse: orderData.engineResponse ? JSON.stringify(orderData.engineResponse.result) : undefined
        });

        // Override the TGF order number to ensure it's correct
        systemFieldMapping.TGF_Order = tgfOrderNumber;

        // Process APP/RSR Engine response if provided
        let finalSystemFieldMapping = systemFieldMapping;
        if (orderData.engineResponse) {
          console.log(`🔄 Processing APP/RSR Engine response for ${tgfOrderNumber}...`);
          finalSystemFieldMapping = zohoOrderFieldsService.updateOrderStatusFromEngineResponse(
            systemFieldMapping,
            orderData.engineResponse
          );
          // Preserve the correct TGF order number
          finalSystemFieldMapping.TGF_Order = tgfOrderNumber;
        }

        // Calculate total amount for this outcome
        const outcomeTotal = outcome.items.reduce((sum, item) => sum + item.totalPrice, 0);

        // Create deal name with outcome details
        const dealName = `${orderData.customerName} - ${outcome.outcome} - $${outcomeTotal.toFixed(2)}`;

        // Extract system fields for Zoho
        const systemFields = {
          TGF_Order: finalSystemFieldMapping.TGF_Order,
          Fulfillment_Type: finalSystemFieldMapping.Fulfillment_Type,
          Flow: finalSystemFieldMapping.Flow,
          Order_Status: finalSystemFieldMapping.Order_Status,
          Consignee: finalSystemFieldMapping.Consignee,
          Ordering_Account: finalSystemFieldMapping.Ordering_Account,
          Hold_Type: finalSystemFieldMapping.Hold_Type,
          Hold_Started_At: finalSystemFieldMapping.Hold_Started_At,
          APP_Status: finalSystemFieldMapping.APP_Status,
          APP_Response: finalSystemFieldMapping.APP_Response,
          APP_Confirmed: finalSystemFieldMapping.APP_Confirmed,
          Submitted: finalSystemFieldMapping.Submitted
        };

        // Create the Zoho deal using the correct method
        const dealResult = await this.zohoService.createOrderDeal({
          contactId: contactId,
          orderNumber: tgfOrderNumber,
          totalAmount: outcomeTotal,
          orderItems: outcome.items,
          membershipTier: orderData.membershipTier || 'Bronze',
          fflRequired: outcome.items.some(item => item.fflRequired || false),
          fflDealerName: orderData.fflDealerName,
          orderStatus: systemFields.Order_Status,
          systemFields: systemFields
        });

        if (dealResult.success && dealResult.dealId) {
          createdOrders.push({
            dealId: dealResult.dealId || '',
            contactId: contactId,
            tgfOrderNumber: tgfOrderNumber,
            outcome: outcome.outcome,
            zohoFields: systemFields
          });
          
          console.log(`✅ Created ${outcome.outcome} deal ${dealResult.dealId} with TGF order ${tgfOrderNumber}`);
        } else {
          console.error(`❌ Failed to create ${outcome.outcome} deal: ${dealResult.error}`);
          return {
            success: false,
            orders: createdOrders,
            totalOrders: createdOrders.length,
            error: `Failed to create deal for ${outcome.outcome}: ${dealResult.error}`
          };
        }
      }

      console.log(`🎉 Successfully created ${createdOrders.length} split orders from original order ${orderData.orderNumber}`);
      
      return {
        success: true,
        orders: createdOrders,
        totalOrders: createdOrders.length
      };

    } catch (error: any) {
      console.error('Order splitting integration error:', error);
      return {
        success: false,
        orders: [],
        totalOrders: 0,
        error: `Order splitting error: ${error.message}`
      };
    }
  }

  /**
   * Create or update a Zoho Deal with automatic system field population
   * This populates all system fields but NOT the RSR-only fields (Carrier, Tracking_Number, Estimated_Ship_Date)
   */
  async processOrderWithSystemFields(orderData: OrderToZohoData): Promise<{
    success: boolean;
    dealId?: string;
    contactId?: string;
    tgfOrderNumber?: string;
    zohoFields?: any;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing order ${orderData.orderNumber} with automatic system field population...`);

      // 1. Get next sequential TGF order number (from inventory, not RSR)
      const baseOrderNumber = await zohoOrderFieldsService.getNextOrderNumber(orderData.isTestOrder);
      
      // 2. Determine system characteristics
      const fulfillmentType = orderData.fulfillmentType || 
        zohoOrderFieldsService.determineFulfillmentType(
          orderData.orderingAccount || '99901', 
          orderData.requiresDropShip || false
        );
      
      const requiresFFL = orderData.orderItems.some(item => item.fflRequired);
      const consignee = zohoOrderFieldsService.determineConsignee(fulfillmentType, requiresFFL);
      
      // 3. Build initial system field mapping
      let systemFieldMapping = zohoOrderFieldsService.buildOrderFieldMapping({
        orderNumber: orderData.orderNumber,
        baseOrderNumber: await zohoOrderFieldsService.getNextOrderNumber(orderData.isTestOrder),
        fulfillmentType,
        orderingAccount: (orderData.orderingAccount || '99901') as '99901' | '99902' | '63824' | '60742',
        consignee,
        requiresFFL,
        isTest: orderData.isTestOrder || false,
        holdType: orderData.holdType as 'FFL not on file' | 'Gun Count Rule' | undefined,
        // Leave RSR-only fields as undefined (they'll be populated separately when RSR responds)
        carrier: undefined,
        trackingNumber: undefined,
        estimatedShipDate: undefined,
        // APP fields - extract from engineResponse if available
        appTgfOrderNumber: orderData.engineResponse?.result?.OrderNumber,
        appResponse: orderData.engineResponse ? JSON.stringify(orderData.engineResponse.result) : undefined
      });

      // 4. Process APP/RSR Engine response if provided
      if (orderData.engineResponse) {
        console.log('🔄 Processing APP/RSR Engine response...');
        systemFieldMapping = zohoOrderFieldsService.updateOrderStatusFromEngineResponse(
          systemFieldMapping,
          orderData.engineResponse
        );
        console.log(`✅ APP response processed - TGF Order: ${systemFieldMapping.TGF_Order}`);
      }

      // Debug: Log what we got from the service
      console.log(`🔍 Debug systemFieldMapping from service:`, {
        Hold_Started_At: systemFieldMapping.Hold_Started_At,
        APP_Response: systemFieldMapping.APP_Response ? 'present' : 'missing',
        APP_Status: systemFieldMapping.APP_Status,
        Hold_Type: systemFieldMapping.Hold_Type
      });

      // Extract only system fields (excluding RSR-only fields for basic order processing)
      const systemFields = {
        TGF_Order: systemFieldMapping.TGF_Order,
        Fulfillment_Type: systemFieldMapping.Fulfillment_Type,
        Flow: systemFieldMapping.Flow,
        Order_Status: systemFieldMapping.Order_Status,
        Consignee: systemFieldMapping.Consignee,
        Ordering_Account: systemFieldMapping.Ordering_Account,
        Hold_Type: systemFieldMapping.Hold_Type,
        Hold_Started_At: systemFieldMapping.Hold_Started_At, // Add Hold_Started_At field
        APP_Status: systemFieldMapping.APP_Status,
        APP_Response: systemFieldMapping.APP_Response,
        APP_Confirmed: systemFieldMapping.APP_Confirmed,
        Submitted: systemFieldMapping.Submitted
        // Note: Last_Distributor_Update is NULL until distributor provides new info
        // Note: Carrier, Tracking_Number, Estimated_Ship_Date are RSR-only and not included
      };

      // Debug: Log what we're sending to Zoho
      console.log(`🔍 Debug systemFields being sent:`, {
        Hold_Started_At: systemFields.Hold_Started_At,
        APP_Response: systemFields.APP_Response ? 'present' : 'missing',
        APP_Status: systemFields.APP_Status
      });

      // 4. Find or create customer contact
      let contactId = orderData.zohoContactId;
      
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
          console.log(`✅ Found existing contact: ${contactId}`);
        } else {
          const nameParts = orderData.customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newContact = await this.zohoService.createContact({
            Email: orderData.customerEmail,
            First_Name: firstName,
            Last_Name: lastName,
            Lead_Source: 'TheGunFirm.com',
            Description: JSON.stringify({
              membershipTier: orderData.membershipTier,
              accountType: 'Customer',
              createdFrom: 'System Order Processing'
            })
          });

          contactId = newContact.id;
          console.log(`✅ Created new contact: ${contactId}`);
        }
      }

      // 5. Check for existing deal
      const existingDeal = await this.zohoService.getDealByOrderNumber(orderData.orderNumber);
      
      if (existingDeal) {
        // Update existing deal with system fields
        const dealUpdateData = {
          Stage: this.mapOrderStatusToStage(systemFields.Order_Status),
          ...systemFields
        };

        const updated = await this.zohoService.updateDealStage(existingDeal.id, systemFields.Order_Status);
        console.log(`📝 Updated existing deal ${existingDeal.id} with system fields: ${updated ? 'success' : 'failed'}`);
        
        return {
          success: true,
          dealId: existingDeal.id,
          contactId,
          tgfOrderNumber: systemFields.TGF_Order,
          zohoFields: systemFields
        };
      }

      // 6. Create new deal with system order processing and proper field mapping
      const fflRequired = orderData.orderItems.some(item => item.fflRequired);
      
      const dealResult = await this.zohoService.createOrderDeal({
        contactId: contactId!,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        orderItems: orderData.orderItems,
        membershipTier: orderData.membershipTier,
        fflRequired,
        fflDealerName: orderData.fflDealerName,
        orderStatus: systemFields.Order_Status,
        systemFields: systemFields // Pass the mapped system fields
      });

      if (dealResult.success) {
        console.log(`✅ Created system deal ${dealResult.dealId} with TGF order ${systemFields.TGF_Order}`);
        return {
          success: true,
          dealId: dealResult.dealId,
          contactId,
          tgfOrderNumber: systemFields.TGF_Order,
          zohoFields: systemFields
        };
      } else {
        console.error(`❌ Failed to create system deal: ${dealResult.error}`);
        return {
          success: false,
          error: dealResult.error
        };
      }

    } catch (error: any) {
      console.error('System order-to-Zoho integration error:', error);
      return {
        success: false,
        error: `System integration error: ${error.message}`
      };
    }
  }

  /**
   * Build order description for Zoho deal
   */
  private buildOrderDescription(orderData: OrderToZohoData): string {
    const items = orderData.orderItems.map(item => 
      `${item.productName} (${item.sku}) - Qty: ${item.quantity} @ $${item.unitPrice}`
    ).join('\n');
    
    return `Order: ${orderData.orderNumber}\nTier: ${orderData.membershipTier}\nFFL: ${orderData.fflDealerName || 'N/A'}\n\nItems:\n${items}`;
  }

  /**
   * Create or update a Zoho Deal for a TheGunFirm order with comprehensive RSR field mapping
   */
  async processOrderToDeal(orderData: OrderToZohoData): Promise<{
    success: boolean;
    dealId?: string;
    contactId?: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 Processing order ${orderData.orderNumber} to Zoho CRM...`);

      // 1. Find or create customer contact
      let contactId = orderData.zohoContactId;
      
      if (!contactId) {
        const existingContact = await this.zohoService.findContactByEmail(orderData.customerEmail);
        
        if (existingContact) {
          contactId = existingContact.id;
          console.log(`✅ Found existing contact: ${contactId}`);
        } else {
          // Create new contact if customer doesn't exist
          const nameParts = orderData.customerName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newContact = await this.zohoService.createContact({
            Email: orderData.customerEmail,
            First_Name: firstName,
            Last_Name: lastName,
            Lead_Source: 'TheGunFirm.com',
            Description: JSON.stringify({
              membershipTier: orderData.membershipTier,
              accountType: 'Customer',
              createdFrom: 'Order Processing'
            })
          });

          contactId = newContact.id;
          console.log(`✅ Created new contact: ${contactId}`);
        }
      }

      // 2. Check for existing deal
      const existingDeal = await this.zohoService.getDealByOrderNumber(orderData.orderNumber);
      
      if (existingDeal) {
        // Update existing deal if status changed
        const updated = await this.zohoService.updateDealStage(existingDeal.id, this.mapOrderStatusToStage(orderData.orderStatus));
        console.log(`📝 Updated existing deal ${existingDeal.id}: ${updated ? 'success' : 'failed'}`);
        
        return {
          success: true,
          dealId: existingDeal.id,
          contactId
        };
      }

      // 3. Create new deal
      const fflRequired = orderData.orderItems.some(item => item.fflRequired);
      
      const dealResult = await this.zohoService.createOrderDeal({
        contactId: contactId!,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
        orderItems: orderData.orderItems,
        membershipTier: orderData.membershipTier,
        fflRequired,
        fflDealerName: orderData.fflDealerName,
        orderStatus: orderData.orderStatus
      });

      if (dealResult.success) {
        console.log(`✅ Created new deal ${dealResult.dealId} for order ${orderData.orderNumber}`);
        return {
          success: true,
          dealId: dealResult.dealId,
          contactId
        };
      } else {
        console.error(`❌ Failed to create deal: ${dealResult.error}`);
        return {
          success: false,
          error: dealResult.error
        };
      }

    } catch (error: any) {
      console.error('Order-to-Zoho integration error:', error);
      return {
        success: false,
        error: `Integration error: ${error.message}`
      };
    }
  }

  /**
   * Update deal status when order status changes
   */
  async updateOrderStatus(orderNumber: string, newStatus: string): Promise<boolean> {
    try {
      const existingDeal = await this.zohoService.getDealByOrderNumber(orderNumber);
      
      if (existingDeal) {
        const updated = await this.zohoService.updateDealStage(existingDeal.id, newStatus);
        console.log(`📝 Updated deal ${existingDeal.id} status to ${newStatus}: ${updated ? 'success' : 'failed'}`);
        return updated;
      }

      console.log(`⚠️  No deal found for order ${orderNumber}`);
      return false;
    } catch (error: any) {
      console.error('Deal status update error:', error);
      return false;
    }
  }

  /**
   * Extract order data from various order formats for Zoho integration
   */
  static formatOrderForZoho(order: any, customerInfo: any): OrderToZohoData {
    return {
      orderNumber: order.id?.toString() || order.orderNumber || `ORD-${Date.now()}`,
      totalAmount: Math.round((parseFloat(order.totalPrice?.toString() || '0')) * 100) / 100,  // Fix: Round to 2 decimals
      customerEmail: customerInfo.email || order.customerEmail || '',
      customerName: customerInfo.name || 
                   `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() ||
                   order.customerName || 'Customer',
      membershipTier: customerInfo.membershipTier || order.membershipTier || 'Bronze',
      orderItems: (order.items || []).map((item: any) => ({
        productName: item.name || item.description || item.productName || 'Product',
        sku: item.manufacturerPartNumber || item.mfgPartNumber || item.sku || '',
        quantity: parseInt(item.quantity?.toString() || '1'),
        unitPrice: Math.round((parseFloat(item.price?.toString() || item.unitPrice?.toString() || '0')) * 100) / 100,  // Fix: Round to 2 decimals
        totalPrice: Math.round((parseFloat(item.totalPrice?.toString() || (item.price * item.quantity)?.toString() || '0')) * 100) / 100,  // Fix: Round to 2 decimals
        fflRequired: item.fflRequired || item.requiresFFL || false
      })),
      fflDealerName: order.fflDealerName || customerInfo.fflDealerName,
      orderStatus: order.status || 'pending',
      zohoContactId: customerInfo.zohoContactId || order.zohoContactId
    };
  }
}

// Export singleton instance
export const orderZohoIntegration = new OrderZohoIntegration();