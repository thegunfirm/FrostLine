import { ZohoService } from '../zoho-service';

interface ProductData {
  sku: string;
  productName?: string;
  manufacturer?: string;
  productCategory?: string;
  fflRequired?: boolean;
  dropShipEligible?: boolean;
  inHouseOnly?: boolean;
  distributorPartNumber?: string;
  distributor?: string;
}

interface ProductLookupResult {
  productId: string;
  created: boolean;
  error?: string;
}

/**
 * Service for finding or creating Products in Zoho CRM based on SKU
 * Implements the dynamic product lookup system with de-duplication
 */
export class ZohoProductLookupService {
  private zohoService: ZohoService;
  private skuToProductIdCache: Map<string, string> = new Map();

  constructor(zohoService: ZohoService) {
    this.zohoService = zohoService;
  }

  /**
   * Find or create a product by SKU with batch de-duplication
   */
  async findOrCreateProductBySKU(productData: ProductData): Promise<ProductLookupResult> {
    try {
      // Step 1: Normalize the SKU
      const normalizedSKU = this.normalizeSKU(productData.sku);
      if (!normalizedSKU) {
        return { productId: '', created: false, error: 'Empty or invalid SKU' };
      }

      // Step 2: Check in-memory cache first (batch de-dupe)
      if (this.skuToProductIdCache.has(normalizedSKU)) {
        return { 
          productId: this.skuToProductIdCache.get(normalizedSKU)!, 
          created: false 
        };
      }

      // Step 3: Search Products by SKU in Zoho
      const existingProduct = await this.searchProductBySKU(normalizedSKU);
      if (existingProduct) {
        this.skuToProductIdCache.set(normalizedSKU, existingProduct);
        return { productId: existingProduct, created: false };
      }

      // Step 4: Create the Product (when not found)
      const newProductId = await this.createProduct(normalizedSKU, productData);
      if (newProductId) {
        this.skuToProductIdCache.set(normalizedSKU, newProductId);
        return { productId: newProductId, created: true };
      }

      return { productId: '', created: false, error: 'Failed to create product' };

    } catch (error: any) {
      console.error('Product lookup error:', error);
      return { productId: '', created: false, error: error.message };
    }
  }

  /**
   * Normalize SKU - trim whitespace and make consistent
   */
  private normalizeSKU(sku: string): string {
    if (!sku || typeof sku !== 'string') {
      return '';
    }
    return sku.trim().toUpperCase();
  }

  /**
   * Search for existing product by SKU
   */
  private async searchProductBySKU(sku: string): Promise<string | null> {
    try {
      // Search Products module with criteria: Product_Code equals SKU (manufacturer part number)
      const searchCriteria = `(Product_Code:equals:${sku})`;
      const response = await this.zohoService.searchRecords('Products', searchCriteria);

      if (response && response.data && response.data.length > 0) {
        if (response.data.length === 1) {
          // Exactly one record - perfect
          return response.data[0].id;
        } else {
          // More than one - data issue, pick most recent
          console.warn(`⚠️ Multiple products found for SKU ${sku}, using most recent`);
          const mostRecent = response.data.sort((a: any, b: any) => 
            new Date(b.Created_Time).getTime() - new Date(a.Created_Time).getTime()
          )[0];
          return mostRecent.id;
        }
      }

      return null; // Zero records found

    } catch (error: any) {
      console.error('Product search error:', error);
      return null;
    }
  }

  /**
   * Create a new product with minimal valid fields
   */
  private async createProduct(sku: string, productData: ProductData): Promise<string | null> {
    try {
      const productPayload = {
        Product_Name: productData.productName || sku,
        Product_Code: sku, // FIXED: Manufacturer Part Number (not RSR stock number)
        Distributor_Part_Number: productData.distributorPartNumber || '', // RSR stock number
        Distributor: productData.distributor || 'RSR',
        Distributor_Code: 'RSR',
        ...(productData.manufacturer && { Manufacturer: productData.manufacturer }),
        ...(productData.productCategory && { Product_Category: productData.productCategory }),
        ...(productData.fflRequired !== undefined && { FFL_Required: productData.fflRequired }),
        ...(productData.dropShipEligible !== undefined && { Drop_Ship_Eligible: productData.dropShipEligible }),
        ...(productData.inHouseOnly !== undefined && { In_House_Only: productData.inHouseOnly })
      };

      const response = await this.zohoService.createRecord('Products', productPayload);
      
      if (response && response.data && response.data.length > 0) {
        console.log(`✅ Created new product for SKU ${sku}: ${response.data[0].id}`);
        return response.data[0].details.id;
      }

      return null;

    } catch (error: any) {
      // Handle duplicate error (race condition)
      if (error.message && error.message.includes('duplicate')) {
        console.log(`🔄 Duplicate detected for SKU ${sku}, re-searching...`);
        // Re-run the search and use found record
        return await this.searchProductBySKU(sku);
      }
      
      console.error('Product creation error:', error);
      return null;
    }
  }

  /**
   * Clear the in-memory cache (call between order submissions)
   */
  clearCache(): void {
    this.skuToProductIdCache.clear();
  }

  /**
   * Get current cache state for debugging
   */
  getCacheState(): Record<string, string> {
    return Object.fromEntries(this.skuToProductIdCache);
  }
}