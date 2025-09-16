import { ProductDeduplicationService } from './product-deduplication';
import { randomUUID } from 'crypto';

/**
 * Batch Deduplication Service
 * 
 * Processes UPCs in batches to handle the 27,654 duplicate products safely
 * Includes monitoring, progress tracking, and rollback capabilities
 */

export interface BatchDeduplicationOptions {
  batchSize?: number;
  delayBetweenBatches?: number; // milliseconds
  skipValidation?: boolean;
  dryRun?: boolean;
  targetUPCs?: string[]; // For testing specific UPCs
}

export interface BatchDeduplicationResult {
  batchId: string;
  totalUPCs: number;
  processedUPCs: number;
  totalProductsProcessed: number;
  totalErrors: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  processingTimeMs: number;
}

export class BatchDeduplicationService {
  /**
   * Execute full deduplication process in batches
   */
  public static async executeBatchDeduplication(
    options: BatchDeduplicationOptions = {}
  ): Promise<BatchDeduplicationResult> {
    const {
      batchSize = 50,
      delayBetweenBatches = 1000,
      skipValidation = false,
      dryRun = false,
      targetUPCs = null
    } = options;

    const batchId = randomUUID();
    const startTime = new Date();
    
    console.log(`🚀 Starting batch deduplication process (Batch ID: ${batchId})`);
    console.log(`📊 Batch size: ${batchSize}, Delay: ${delayBetweenBatches}ms, Dry run: ${dryRun}`);

    let totalUPCs = 0;
    let processedUPCs = 0;
    let totalProductsProcessed = 0;
    let totalErrors = 0;
    const allErrors: string[] = [];

    try {
      // Get list of UPCs to process
      const duplicateUPCs = targetUPCs || await ProductDeduplicationService.getDuplicateUPCs();
      totalUPCs = duplicateUPCs.length;

      console.log(`📋 Found ${totalUPCs} UPCs with duplicates to process`);

      if (!skipValidation) {
        console.log('🔍 Running pre-processing validation...');
        const validationResult = await this.validateBeforeProcessing();
        if (!validationResult.isValid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }
        console.log('✅ Pre-processing validation passed');
      }

      if (dryRun) {
        console.log('🧪 DRY RUN MODE - No actual changes will be made');
        
        // Simulate processing for dry run
        for (let i = 0; i < Math.min(10, duplicateUPCs.length); i++) {
          const upc = duplicateUPCs[i];
          try {
            const duplicateGroup = await ProductDeduplicationService.createDuplicateGroup(upc);
            console.log(`[DRY RUN] UPC ${upc}: Would archive ${duplicateGroup.duplicatesForArchival.length} products`);
            processedUPCs++;
            totalProductsProcessed += duplicateGroup.duplicatesForArchival.length;
          } catch (error) {
            console.error(`[DRY RUN] Error processing UPC ${upc}: ${error}`);
            allErrors.push(`DRY RUN - UPC ${upc}: ${error}`);
            totalErrors++;
          }
        }
      } else {
        // Process UPCs in batches
        for (let i = 0; i < duplicateUPCs.length; i += batchSize) {
          const batch = duplicateUPCs.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(duplicateUPCs.length / batchSize);

          console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (UPCs ${i + 1}-${Math.min(i + batchSize, duplicateUPCs.length)})`);

          // Process each UPC in the current batch
          for (const upc of batch) {
            try {
              const result = await ProductDeduplicationService.processDuplicateGroup(upc, batchId);
              processedUPCs++;
              totalProductsProcessed += result.processed;
              
              if (result.errors.length > 0) {
                allErrors.push(...result.errors);
                totalErrors += result.errors.length;
              }

              // Log progress every 10 UPCs
              if (processedUPCs % 10 === 0) {
                console.log(`⚡ Progress: ${processedUPCs}/${totalUPCs} UPCs processed (${totalProductsProcessed} products archived)`);
              }

            } catch (error) {
              console.error(`❌ Failed to process UPC ${upc}: ${error}`);
              allErrors.push(`UPC ${upc}: ${error}`);
              totalErrors++;
            }
          }

          // Delay between batches to avoid overwhelming the database
          if (i + batchSize < duplicateUPCs.length && delayBetweenBatches > 0) {
            console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }
      }

    } catch (error) {
      console.error(`💥 Fatal error in batch deduplication: ${error}`);
      allErrors.push(`Fatal error: ${error}`);
      totalErrors++;
    }

    const endTime = new Date();
    const processingTimeMs = endTime.getTime() - startTime.getTime();

    const result: BatchDeduplicationResult = {
      batchId,
      totalUPCs,
      processedUPCs,
      totalProductsProcessed,
      totalErrors,
      errors: allErrors,
      startTime,
      endTime,
      processingTimeMs
    };

    // Final summary
    console.log('\n📊 BATCH DEDUPLICATION SUMMARY');
    console.log('================================');
    console.log(`Batch ID: ${batchId}`);
    console.log(`Total UPCs: ${totalUPCs}`);
    console.log(`Processed UPCs: ${processedUPCs}`);
    console.log(`Products archived: ${totalProductsProcessed}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Processing time: ${(processingTimeMs / 1000).toFixed(2)}s`);
    console.log(`Success rate: ${((processedUPCs / totalUPCs) * 100).toFixed(2)}%`);

    if (totalErrors > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      allErrors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
      if (allErrors.length > 10) {
        console.log(`  ... and ${allErrors.length - 10} more errors`);
      }
    }

    return result;
  }

  /**
   * Validate system state before processing
   */
  private static async validateBeforeProcessing(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check deduplication stats
      const stats = await ProductDeduplicationService.getDeduplicationStats();
      
      console.log(`📈 Current stats: ${stats.totalProducts} products, ${stats.uniqueUPCs} unique UPCs, ${stats.potentialDuplicates} potential duplicates`);
      
      if (stats.potentialDuplicates === 0) {
        warnings.push('No duplicate products found to process');
      }

      if (stats.potentialDuplicates > 50000) {
        warnings.push(`Very large number of duplicates (${stats.potentialDuplicates}) - consider processing in smaller batches`);
      }

      // Check database connectivity
      console.log('🔗 Testing database connectivity...');
      const testUPCs = await ProductDeduplicationService.getDuplicateUPCs();
      if (testUPCs.length === 0) {
        warnings.push('No duplicate UPCs found in current query');
      }

      // TODO: Add more validation checks as needed
      // - Check disk space
      // - Check database locks
      // - Check order processing status

    } catch (error) {
      errors.push(`Validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test deduplication with a small sample
   */
  public static async testDeduplication(sampleSize: number = 5): Promise<BatchDeduplicationResult> {
    console.log(`🧪 Running test deduplication with ${sampleSize} UPCs`);
    
    // Get a small sample of duplicate UPCs
    const allDuplicateUPCs = await ProductDeduplicationService.getDuplicateUPCs();
    const testUPCs = allDuplicateUPCs.slice(0, sampleSize);
    
    console.log(`📋 Test UPCs: ${testUPCs.join(', ')}`);

    return await this.executeBatchDeduplication({
      batchSize: 10,
      delayBetweenBatches: 500,
      skipValidation: false,
      dryRun: false,
      targetUPCs: testUPCs
    });
  }

  /**
   * Dry run to preview what would be processed
   */
  public static async dryRunDeduplication(): Promise<BatchDeduplicationResult> {
    console.log('🧪 Running dry run deduplication (no changes will be made)');
    
    return await this.executeBatchDeduplication({
      batchSize: 50,
      delayBetweenBatches: 100,
      skipValidation: false,
      dryRun: true
    });
  }

  /**
   * Get current deduplication progress/status
   */
  public static async getDeduplicationProgress(): Promise<{
    stats: any;
    recentBatches: any[];
    duplicateUPCsRemaining: number;
  }> {
    const stats = await ProductDeduplicationService.getDeduplicationStats();
    const duplicateUPCs = await ProductDeduplicationService.getDuplicateUPCs();

    // TODO: Query recent dedup_log entries for batch status
    const recentBatches: any[] = [];

    return {
      stats,
      recentBatches,
      duplicateUPCsRemaining: duplicateUPCs.length
    };
  }
}