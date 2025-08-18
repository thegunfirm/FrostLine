import { db } from '../db';
import { products } from '../../shared/schema';
import { eq, or, ilike, sql } from 'drizzle-orm';

export interface ProductLookupResult {
  id: number;
  sku: string | null;
  name: string;
  manufacturer: string | null;
  manufacturerPartNumber: string | null;
  rsrStockNumber: string | null;
  priceWholesale: string;
  priceMAP: string | null;
  priceMSRP: string | null;
  category: string;
  requiresFFL: boolean;
  dropShippable: boolean;
  isFirearm: boolean;
  upcCode: string | null;
  weight: string | null;
}

export interface ZohoSubformProduct {
  Product_Name: string;
  Product_Code: string;
  Quantity: number;
  Unit_Price: number;
  Total_Price: number;
  Distributor_Part_Number: string;
  Manufacturer: string;
  Product_Category: string;
  FFL_Required: boolean;
  Drop_Ship_Eligible: boolean;
  In_House_Only: boolean;
  Distributor: string;
  UPC_Code: string;
  Weight: string;
  Manufacturer_Part_Number: string;
}

export class ProductLookupService {
  
  /**
   * Look up product by SKU from the real RSR database
   */
  async findProductBySku(sku: string): Promise<ProductLookupResult | null> {
    try {
      const [product] = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          manufacturer: products.manufacturer,
          manufacturerPartNumber: products.manufacturerPartNumber,
          rsrStockNumber: products.rsrStockNumber,
          priceWholesale: products.priceWholesale,
          priceMAP: products.priceMAP,
          priceMSRP: products.priceMSRP,
          category: products.category,
          requiresFFL: products.requiresFFL,
          dropShippable: products.dropShippable,
          isFirearm: products.isFirearm,
          upcCode: products.upcCode,
          weight: products.weight
        })
        .from(products)
        .where(eq(products.sku, sku))
        .limit(1);

      if (!product || !product.sku) {
        console.log(`⚠️ Product not found for SKU: ${sku}`);
        return null;
      }

      return product;
    } catch (error: any) {
      console.error(`❌ Error looking up product ${sku}:`, error.message);
      return null;
    }
  }

  /**
   * Search products by multiple criteria (SKU, manufacturer part number, name)
   */
  async searchProducts(query: string, limit: number = 5): Promise<ProductLookupResult[]> {
    try {
      const searchResults = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          manufacturer: products.manufacturer,
          manufacturerPartNumber: products.manufacturerPartNumber,
          rsrStockNumber: products.rsrStockNumber,
          priceWholesale: products.priceWholesale,
          priceMAP: products.priceMAP,
          priceMSRP: products.priceMSRP,
          category: products.category,
          requiresFFL: products.requiresFFL,
          dropShippable: products.dropShippable,
          isFirearm: products.isFirearm,
          upcCode: products.upcCode,
          weight: products.weight
        })
        .from(products)
        .where(
          or(
            ilike(products.sku, `%${query}%`),
            ilike(products.name, `%${query}%`),
            ilike(products.manufacturerPartNumber, `%${query}%`),
            ilike(products.manufacturer, `%${query}%`)
          )
        )
        .limit(limit);

      return searchResults;
    } catch (error: any) {
      console.error(`❌ Error searching products:`, error.message);
      return [];
    }
  }

  /**
   * Convert real product data to Zoho subform format
   */
  convertToZohoSubform(
    product: ProductLookupResult, 
    quantity: number, 
    unitPrice: number
  ): ZohoSubformProduct {
    const totalPrice = quantity * unitPrice;
    
    return {
      Product_Name: product.name,
      Product_Code: product.manufacturerPartNumber || product.sku || 'UNKNOWN', // Use Manufacturer Part Number as Product Code per requirements
      Quantity: quantity,
      Unit_Price: unitPrice,
      Total_Price: totalPrice,
      Distributor_Part_Number: product.rsrStockNumber || product.sku || 'UNKNOWN', // RSR Stock Number maps to Distributor Part Number
      Manufacturer: product.manufacturer || 'Unknown',
      Product_Category: product.category,
      FFL_Required: product.requiresFFL,
      Drop_Ship_Eligible: product.dropShippable,
      In_House_Only: !product.dropShippable, // Inverse of drop shippable
      Distributor: 'RSR',
      UPC_Code: product.upcCode || '',
      Weight: product.weight || '0',
      Manufacturer_Part_Number: product.manufacturerPartNumber || product.sku || 'UNKNOWN'
    };
  }

  /**
   * Process order items and convert to Zoho subform data using real product lookup
   */
  async processOrderItemsForZoho(orderItems: any[]): Promise<{
    success: boolean;
    subformData: ZohoSubformProduct[];
    errors: string[];
  }> {
    const subformData: ZohoSubformProduct[] = [];
    const errors: string[] = [];

    console.log(`🔍 Processing ${orderItems.length} order items for Zoho subform...`);

    for (const item of orderItems) {
      try {
        // Look up real product by SKU
        const product = await this.findProductBySku(item.sku);

        if (!product) {
          // Try to search for similar products
          const searchResults = await this.searchProducts(item.sku, 1);
          if (searchResults.length > 0) {
            console.log(`✅ Found similar product for ${item.sku}: ${searchResults[0].name}`);
            const zohoProduct = this.convertToZohoSubform(
              searchResults[0],
              item.quantity || 1,
              item.unitPrice || item.price || 0
            );
            subformData.push(zohoProduct);
          } else {
            errors.push(`Product not found: ${item.sku}`);
            console.error(`❌ No product found for SKU: ${item.sku}`);
          }
          continue;
        }

        // Convert to Zoho subform format
        const zohoProduct = this.convertToZohoSubform(
          product,
          item.quantity || 1,
          item.unitPrice || item.price || 0
        );

        subformData.push(zohoProduct);
        console.log(`✅ Processed product: ${product.name} (${product.sku})`);

      } catch (error: any) {
        const errorMsg = `Failed to process item ${item.sku}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`📊 Processed ${subformData.length} products for Zoho subform (${errors.length} errors)`);

    return {
      success: errors.length === 0,
      subformData,
      errors
    };
  }

  /**
   * Get sample real products for testing
   */
  async getSampleProducts(limit: number = 5): Promise<ProductLookupResult[]> {
    try {
      const sampleProducts = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          manufacturer: products.manufacturer,
          manufacturerPartNumber: products.manufacturerPartNumber,
          rsrStockNumber: products.rsrStockNumber,
          priceWholesale: products.priceWholesale,
          priceMAP: products.priceMAP,
          priceMSRP: products.priceMSRP,
          category: products.category,
          requiresFFL: products.requiresFFL,
          dropShippable: products.dropShippable,
          isFirearm: products.isFirearm,
          upcCode: products.upcCode,
          weight: products.weight
        })
        .from(products)
        .where(sql`manufacturer IS NOT NULL AND sku IS NOT NULL`)
        .limit(limit);

      return sampleProducts;
    } catch (error: any) {
      console.error(`❌ Error getting sample products:`, error.message);
      return [];
    }
  }
}

export const productLookupService = new ProductLookupService();