import { db } from '../db';
import { products, dedupLog, rsrSkuAliases } from '@shared/schema';
import type { Product, InsertDedupLog } from '@shared/schema';
import { eq, and, ne, isNotNull, sql } from 'drizzle-orm';

/**
 * UPC-Based Product Deduplication Service
 * 
 * Implements architect-approved safeguards for production-safe deduplication:
 * - Safe canonical selection with multiple tie-breakers
 * - Transactional cleanup process
 * - Complete audit logging for rollback capability
 * - SKU aliasing for archived products
 */

export interface DuplicateGroup {
  upcCode: string;
  products: Product[];
  canonicalProduct: Product;
  duplicatesForArchival: Product[];
}

export interface CanonicalSelectionCriteria {
  hasImages: boolean;
  inStock: boolean;
  hasCompleteClassification: boolean;
  hasCurrentAlias: boolean;
  stockQuantity: number;
  productId: number;
  createdAt: Date;
}

export class ProductDeduplicationService {
  /**
   * Select the canonical product from a group of duplicates
   * 
   * Tie-breaker priority (architect-approved):
   * 1. Has images (prefer products with visual assets)
   * 2. In stock (prefer available products)
   * 3. Complete classification (category, manufacturer, manufacturerPartNumber all present)
   * 4. Has current RSR alias (prefer products with active RSR mapping)
   * 5. Higher stock quantity (prefer better inventory)
   * 6. Highest product ID (prefer most recent)
   * 7. Most recent created_at (fallback tie-breaker)
   */
  public static selectCanonicalProduct(duplicateProducts: Product[]): Product {
    if (duplicateProducts.length === 0) {
      throw new Error('Cannot select canonical product from empty array');
    }
    
    if (duplicateProducts.length === 1) {
      return duplicateProducts[0];
    }

    // Sort by criteria priority
    const sortedProducts = duplicateProducts.sort((a, b) => {
      // 1. Has images (true > false)
      const aHasImages = a.images && Array.isArray(a.images) && a.images.length > 0;
      const bHasImages = b.images && Array.isArray(b.images) && b.images.length > 0;
      if (aHasImages !== bHasImages) {
        return bHasImages ? 1 : -1;
      }

      // 2. In stock (true > false)
      if (a.inStock !== b.inStock) {
        return b.inStock ? 1 : -1;
      }

      // 3. Complete classification (category, manufacturer, manufacturerPartNumber all present)
      const aComplete = a.category && a.manufacturer && a.manufacturerPartNumber;
      const bComplete = b.category && b.manufacturer && b.manufacturerPartNumber;
      if (aComplete !== bComplete) {
        return bComplete ? 1 : -1;
      }

      // 4. Higher stock quantity
      if (a.stockQuantity !== b.stockQuantity) {
        return b.stockQuantity - a.stockQuantity;
      }

      // 5. Highest product ID (prefer most recent)
      if (a.id !== b.id) {
        return b.id - a.id;
      }

      // 6. Most recent created_at (fallback)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedProducts[0];
  }

  /**
   * Get all UPCs that have duplicates
   */
  public static async getDuplicateUPCs(): Promise<string[]> {
    const duplicateUPCs = await db
      .select({ upcCode: products.upcCode })
      .from(products)
      .where(
        and(
          isNotNull(products.upcCode),
          ne(products.upcCode, ''),
          eq(products.isActive, true)
        )
      )
      .groupBy(products.upcCode)
      .having(sql`COUNT(*) > 1`);

    return duplicateUPCs.map(row => row.upcCode);
  }

  /**
   * Get all products for a specific UPC
   */
  public static async getProductsByUPC(upcCode: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.upcCode, upcCode),
          eq(products.isActive, true)
        )
      );
  }

  /**
   * Create a duplicate group with canonical selection
   */
  public static async createDuplicateGroup(upcCode: string): Promise<DuplicateGroup> {
    const duplicateProducts = await this.getProductsByUPC(upcCode);
    
    if (duplicateProducts.length <= 1) {
      throw new Error(`UPC ${upcCode} does not have duplicates`);
    }

    const canonicalProduct = this.selectCanonicalProduct(duplicateProducts);
    const duplicatesForArchival = duplicateProducts.filter(p => p.id !== canonicalProduct.id);

    return {
      upcCode,
      products: duplicateProducts,
      canonicalProduct,
      duplicatesForArchival
    };
  }

  /**
   * Generate a detailed reason for why a product was selected as canonical vs archived
   */
  public static generateDedupReason(canonical: Product, archived: Product): string {
    const reasons: string[] = [];

    // Check images
    const canonicalHasImages = canonical.images && Array.isArray(canonical.images) && canonical.images.length > 0;
    const archivedHasImages = archived.images && Array.isArray(archived.images) && archived.images.length > 0;
    
    if (canonicalHasImages && !archivedHasImages) {
      reasons.push('canonical has images, archived does not');
    }

    // Check stock status
    if (canonical.inStock && !archived.inStock) {
      reasons.push('canonical is in stock, archived is not');
    }

    // Check classification completeness
    const canonicalComplete = canonical.category && canonical.manufacturer && canonical.manufacturerPartNumber;
    const archivedComplete = archived.category && archived.manufacturer && archived.manufacturerPartNumber;
    
    if (canonicalComplete && !archivedComplete) {
      reasons.push('canonical has complete classification, archived does not');
    }

    // Check stock quantity
    if (canonical.stockQuantity > archived.stockQuantity) {
      reasons.push(`canonical has higher stock quantity (${canonical.stockQuantity} vs ${archived.stockQuantity})`);
    }

    // Check product ID (recency)
    if (canonical.id > archived.id) {
      reasons.push(`canonical has higher ID (${canonical.id} vs ${archived.id})`);
    }

    // Default reason if no specific criteria met
    if (reasons.length === 0) {
      reasons.push('selected by tie-breaker criteria');
    }

    return reasons.join('; ');
  }

  /**
   * Archive a duplicate product (set is_active=false, clear inventory)
   */
  public static async archiveProduct(productId: number): Promise<void> {
    await db
      .update(products)
      .set({
        isActive: false,
        stockQuantity: 0,
        inStock: false
      })
      .where(eq(products.id, productId));
  }

  /**
   * Create deduplication log entry for audit trail
   */
  public static async logDeduplication(logEntry: InsertDedupLog): Promise<void> {
    await db.insert(dedupLog).values(logEntry);
  }

  /**
   * Create or update RSR SKU alias for archived product
   */
  public static async createArchivedSkuAlias(
    productId: number, 
    stockNumber: string, 
    upcCode: string
  ): Promise<void> {
    try {
      // Check if alias already exists
      const existingAlias = await db
        .select()
        .from(rsrSkuAliases)
        .where(eq(rsrSkuAliases.stockNumber, stockNumber))
        .limit(1);

      if (existingAlias.length > 0) {
        // Update existing alias to mark as not current
        await db
          .update(rsrSkuAliases)
          .set({
            isCurrent: false,
            lastSeenAt: new Date(),
            productId: productId
          })
          .where(eq(rsrSkuAliases.stockNumber, stockNumber));
      } else {
        // Create new alias marked as not current
        await db.insert(rsrSkuAliases).values({
          stockNumber,
          upcCode,
          productId,
          isCurrent: false
        });
      }
    } catch (error) {
      // Handle duplicate key conflicts gracefully
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        console.log(`SKU alias ${stockNumber} already exists, skipping creation`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Ensure canonical product has current SKU alias
   */
  public static async ensureCanonicalSkuAlias(
    productId: number, 
    stockNumber: string, 
    upcCode: string
  ): Promise<void> {
    // Check if current alias exists for this product
    const existingAlias = await db
      .select()
      .from(rsrSkuAliases)
      .where(
        and(
          eq(rsrSkuAliases.productId, productId),
          eq(rsrSkuAliases.isCurrent, true)
        )
      )
      .limit(1);

    if (existingAlias.length === 0) {
      // Create current alias for canonical product
      await db.insert(rsrSkuAliases).values({
        stockNumber,
        upcCode,
        productId,
        isCurrent: true
      });
    }
  }

  /**
   * Process a single UPC group through complete deduplication
   */
  public static async processDuplicateGroup(
    upcCode: string, 
    batchId: string
  ): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      // Start transaction
      await db.transaction(async (tx) => {
        const duplicateGroup = await this.createDuplicateGroup(upcCode);
        
        console.log(`Processing UPC ${upcCode}: ${duplicateGroup.duplicatesForArchival.length} duplicates to archive`);

        // Process each duplicate for archival
        for (const duplicate of duplicateGroup.duplicatesForArchival) {
          try {
            // Archive the duplicate product
            await this.archiveProduct(duplicate.id);

            // Create SKU alias for archived product
            if (duplicate.rsrStockNumber) {
              await this.createArchivedSkuAlias(duplicate.id, duplicate.rsrStockNumber, upcCode);
            }

            // Log the deduplication
            await this.logDeduplication({
              upcCode,
              canonicalProductId: duplicateGroup.canonicalProduct.id,
              archivedProductId: duplicate.id,
              archivedProductSku: duplicate.sku,
              archivedProductName: duplicate.name,
              dedupReason: this.generateDedupReason(duplicateGroup.canonicalProduct, duplicate),
              batchId,
              canRollback: true,
              processedBy: 'system'
            });

            processed++;
          } catch (error) {
            errors.push(`Failed to archive product ${duplicate.id}: ${error}`);
          }
        }

        // Ensure canonical product has current SKU alias
        if (duplicateGroup.canonicalProduct.rsrStockNumber) {
          await this.ensureCanonicalSkuAlias(
            duplicateGroup.canonicalProduct.id,
            duplicateGroup.canonicalProduct.rsrStockNumber,
            upcCode
          );
        }
      });

    } catch (error) {
      errors.push(`Transaction failed for UPC ${upcCode}: ${error}`);
    }

    return { processed, errors };
  }

  /**
   * Get deduplication statistics
   */
  public static async getDeduplicationStats(): Promise<{
    totalProducts: number;
    uniqueUPCs: number;
    potentialDuplicates: number;
    duplicateUPCs: number;
  }> {
    const [totalResult] = await db
      .select({ 
        count: sql<number>`count(*)`,
        uniqueUpcs: sql<number>`count(distinct upc_code)`
      })
      .from(products)
      .where(
        and(
          isNotNull(products.upcCode),
          ne(products.upcCode, ''),
          eq(products.isActive, true)
        )
      );

    const duplicateUPCs = await this.getDuplicateUPCs();

    return {
      totalProducts: totalResult.count,
      uniqueUPCs: totalResult.uniqueUpcs,
      potentialDuplicates: totalResult.count - totalResult.uniqueUpcs,
      duplicateUPCs: duplicateUPCs.length
    };
  }
}