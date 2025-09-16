import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { products, dedupLog } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Cart Canonicalization Middleware
 * 
 * Resolves guest cart items to canonical products during checkout/server requests
 * Handles cases where users have archived products in their cart
 */

export interface CartItem {
  productId: number;
  quantity: number;
  [key: string]: any;
}

export interface CanonicalizedCartItem extends CartItem {
  originalProductId?: number;
  wasCanonicalized?: boolean;
  canonicalizationReason?: string;
}

export class CartCanonicalizationService {
  /**
   * Resolve a product ID to its canonical equivalent if it was archived during deduplication
   */
  public static async resolveToCanonicalProduct(productId: number): Promise<{
    canonicalProductId: number;
    wasCanonicalized: boolean;
    reason?: string;
  }> {
    // Check if this product was archived during deduplication
    const dedupEntry = await db
      .select({
        canonicalProductId: dedupLog.canonicalProductId,
        dedupReason: dedupLog.dedupReason,
        processedAt: dedupLog.processedAt
      })
      .from(dedupLog)
      .where(eq(dedupLog.archivedProductId, productId))
      .limit(1);

    if (dedupEntry.length > 0) {
      return {
        canonicalProductId: dedupEntry[0].canonicalProductId,
        wasCanonicalized: true,
        reason: `Product was archived during deduplication: ${dedupEntry[0].dedupReason}`
      };
    }

    // Check if the product exists and is active
    const product = await db
      .select({ id: products.id, isActive: products.isActive })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      throw new Error(`Product ${productId} not found`);
    }

    if (!product[0].isActive) {
      // Product is inactive but not in dedup log - handle as edge case
      throw new Error(`Product ${productId} is inactive and cannot be resolved to canonical product`);
    }

    // Product is active and canonical
    return {
      canonicalProductId: productId,
      wasCanonicalized: false
    };
  }

  /**
   * Canonicalize a single cart item
   */
  public static async canonicalizeCartItem(item: CartItem): Promise<CanonicalizedCartItem> {
    try {
      const resolution = await this.resolveToCanonicalProduct(item.productId);
      
      if (resolution.wasCanonicalized) {
        return {
          ...item,
          originalProductId: item.productId,
          productId: resolution.canonicalProductId,
          wasCanonicalized: true,
          canonicalizationReason: resolution.reason
        };
      }

      return item as CanonicalizedCartItem;
    } catch (error) {
      console.error(`Failed to canonicalize cart item ${item.productId}:`, error);
      // Return original item but mark as potentially problematic
      return {
        ...item,
        wasCanonicalized: false,
        canonicalizationReason: `Failed to resolve: ${error.message}`
      } as CanonicalizedCartItem;
    }
  }

  /**
   * Canonicalize an array of cart items
   */
  public static async canonicalizeCartItems(items: CartItem[]): Promise<CanonicalizedCartItem[]> {
    const canonicalizedItems: CanonicalizedCartItem[] = [];
    const consolidationMap = new Map<number, CanonicalizedCartItem>();

    for (const item of items) {
      const canonicalizedItem = await this.canonicalizeCartItem(item);
      
      // Consolidate quantities if multiple items resolve to the same canonical product
      const existingItem = consolidationMap.get(canonicalizedItem.productId);
      if (existingItem) {
        existingItem.quantity += canonicalizedItem.quantity;
        
        // Track all original product IDs that were consolidated
        if (!existingItem.consolidatedFrom) {
          existingItem.consolidatedFrom = [];
        }
        if (canonicalizedItem.originalProductId) {
          existingItem.consolidatedFrom.push(canonicalizedItem.originalProductId);
        }
      } else {
        consolidationMap.set(canonicalizedItem.productId, canonicalizedItem);
      }
    }

    return Array.from(consolidationMap.values());
  }

  /**
   * Validate that all canonicalized cart items reference active products
   */
  public static async validateCanonicalizedCart(items: CanonicalizedCartItem[]): Promise<{
    isValid: boolean;
    invalidItems: CanonicalizedCartItem[];
    warnings: string[];
  }> {
    const invalidItems: CanonicalizedCartItem[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      try {
        const product = await db
          .select({ 
            id: products.id, 
            isActive: products.isActive,
            inStock: products.inStock,
            stockQuantity: products.stockQuantity 
          })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product.length === 0) {
          invalidItems.push(item);
          continue;
        }

        const prod = product[0];
        
        if (!prod.isActive) {
          invalidItems.push(item);
          continue;
        }

        if (!prod.inStock || prod.stockQuantity < item.quantity) {
          warnings.push(`Product ${item.productId} has insufficient stock (requested: ${item.quantity}, available: ${prod.stockQuantity})`);
        }

        if (item.wasCanonicalized) {
          warnings.push(`Product ${item.originalProductId} was automatically resolved to ${item.productId}: ${item.canonicalizationReason}`);
        }
      } catch (error) {
        console.error(`Error validating cart item ${item.productId}:`, error);
        invalidItems.push(item);
      }
    }

    return {
      isValid: invalidItems.length === 0,
      invalidItems,
      warnings
    };
  }
}

/**
 * Express middleware to canonicalize cart data in requests
 */
export function cartCanonicalizationMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if request contains cart data that needs canonicalization
      if (req.body && req.body.items && Array.isArray(req.body.items)) {
        console.log(`🔄 Canonicalizing ${req.body.items.length} cart items for ${req.method} ${req.path}`);
        
        const originalItems = req.body.items as CartItem[];
        const canonicalizedItems = await CartCanonicalizationService.canonicalizeCartItems(originalItems);
        
        // Validate canonicalized cart
        const validation = await CartCanonicalizationService.validateCanonicalizedCart(canonicalizedItems);
        
        if (!validation.isValid) {
          console.error('❌ Cart canonicalization validation failed:', validation.invalidItems);
          return res.status(400).json({
            error: 'Invalid cart items after canonicalization',
            invalidItems: validation.invalidItems
          });
        }

        if (validation.warnings.length > 0) {
          console.warn('⚠️  Cart canonicalization warnings:', validation.warnings);
          // Add warnings to response headers for client awareness
          res.set('X-Cart-Warnings', JSON.stringify(validation.warnings));
        }

        // Replace request items with canonicalized items
        req.body.items = canonicalizedItems;
        
        // Track canonicalization stats
        const canonicalizedCount = canonicalizedItems.filter(item => item.wasCanonicalized).length;
        if (canonicalizedCount > 0) {
          console.log(`✅ Canonicalized ${canonicalizedCount}/${originalItems.length} cart items`);
          res.set('X-Cart-Canonicalized', canonicalizedCount.toString());
        }
      }

      next();
    } catch (error) {
      console.error('💥 Cart canonicalization middleware error:', error);
      // Don't block the request, but log the error
      next();
    }
  };
}

/**
 * Helper function to canonicalize cart data outside of middleware context
 */
export async function canonicalizeCartData(cartData: any): Promise<any> {
  if (cartData && cartData.items && Array.isArray(cartData.items)) {
    const canonicalizedItems = await CartCanonicalizationService.canonicalizeCartItems(cartData.items);
    return {
      ...cartData,
      items: canonicalizedItems
    };
  }
  return cartData;
}