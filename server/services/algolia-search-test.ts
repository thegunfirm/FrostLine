import { algoliasearch } from 'algoliasearch';
// Test service for Algolia UPC/MPN improvements

/**
 * Test service for safely testing Algolia UPC/MPN search improvements
 * Creates a replica index with corrected field mappings
 */
class AlgoliaSearchTestService {
  private client: any;
  private adminClient: any;
  private testIndexName = 'products_upc_mpn_test';

  constructor() {
    const appId = process.env.ALGOLIA_APP_ID || '';
    const apiKey = process.env.ALGOLIA_API_KEY || '';
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || '';

    if (!appId || !apiKey || !adminApiKey) {
      throw new Error('Algolia credentials not configured for testing');
    }

    this.client = algoliasearch(appId, apiKey);
    this.adminClient = algoliasearch(appId, adminApiKey);
  }

  // Create test index with corrected field mappings
  async createTestIndex(): Promise<void> {
    console.log('🧪 Creating test index:', this.testIndexName);
    
    // Corrected settings that align with actual indexed fields
    const correctedSettings = {
      searchableAttributes: [
        'title,description', // Matches indexed 'title' (not 'name')
        'sku', // Contains MPN - matches indexed field
        'upc', // Matches indexed field
        'manufacturerName', // Matches indexed field (not 'manufacturer')
        'categoryName', // Matches indexed field (not 'category')
        'subcategoryName' // Matches indexed field
      ],
      attributesForFaceting: [
        'filterOnly(categoryName)', // Corrected from 'category'
        'filterOnly(manufacturerName)', // Corrected from 'manufacturer'
        'filterOnly(inStock)',
        'filterOnly(newItem)',
        'filterOnly(caliber)',
        'filterOnly(actionType)',
        'filterOnly(barrelLength)',
        'filterOnly(capacity)'
      ],
      // Add separators to improve MPN matching (e.g., "ZP.19BG")
      separatorsToIndex: '.-_/',
      customRanking: [
        'desc(inStock)', // Prioritize in-stock items
        'desc(newItem)',
        'asc(price.retailMap)'
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      hitsPerPage: 24,
      maxValuesPerFacet: 100
    };

    try {
      await this.adminClient.setSettings({
        indexName: this.testIndexName,
        indexSettings: correctedSettings
      });
      console.log('✅ Test index settings configured');
    } catch (error) {
      console.error('❌ Error configuring test index:', error);
      throw error;
    }
  }

  // Copy sample data from production to test index
  async copyTestData(): Promise<void> {
    try {
      console.log('📋 Copying sample data to test index...');
      
      // Get sample data from production index
      const searchResult = await this.client.search({
        requests: [{
          indexName: 'products',
          query: '',
          hitsPerPage: 100
        }]
      });

      const sampleData = searchResult.results[0].hits;
      console.log(`📋 Found ${sampleData.length} products to copy`);

      // Copy to test index
      await this.adminClient.saveObjects({
        indexName: this.testIndexName,
        objects: sampleData
      });

      console.log('✅ Test data copied successfully');
    } catch (error) {
      console.error('❌ Error copying test data:', error);
      throw error;
    }
  }

  // Test UPC search quality
  async testUpcSearch(upc: string): Promise<any> {
    console.log(`🔍 Testing UPC search: ${upc}`);
    
    const result = await this.client.search({
      requests: [{
        indexName: this.testIndexName,
        query: upc,
        hitsPerPage: 5
      }]
    });

    return result.results[0];
  }

  // Test MPN search quality  
  async testMpnSearch(mpn: string): Promise<any> {
    console.log(`🔍 Testing MPN search: ${mpn}`);
    
    const result = await this.client.search({
      requests: [{
        indexName: this.testIndexName,
        query: mpn,
        hitsPerPage: 5
      }]
    });

    return result.results[0];
  }

  // Test filtered search (the main issue we identified)
  async testFilteredSearch(query: string, filters: any): Promise<any> {
    console.log(`🔍 Testing filtered search: "${query}" with filters:`, filters);
    
    const algoliaFilters = [];
    if (filters.categoryName) algoliaFilters.push(`categoryName:"${filters.categoryName}"`);
    if (filters.manufacturerName) algoliaFilters.push(`manufacturerName:"${filters.manufacturerName}"`);
    if (filters.inStock) algoliaFilters.push('inStock:true');

    const result = await this.client.search({
      requests: [{
        indexName: this.testIndexName,
        query,
        filters: algoliaFilters.join(' AND '),
        hitsPerPage: 5
      }]
    });

    return result.results[0];
  }

  // Clean up test index
  async deleteTestIndex(): Promise<void> {
    try {
      await this.adminClient.deleteIndex({ indexName: this.testIndexName });
      console.log('🗑️ Test index deleted');
    } catch (error) {
      console.error('❌ Error deleting test index:', error);
    }
  }

  // Run comprehensive test suite
  async runTestSuite(): Promise<void> {
    console.log('🧪 Starting Algolia UPC/MPN Test Suite...\n');

    try {
      // Setup
      await this.createTestIndex();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for index creation
      await this.copyTestData();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for data sync

      // Test 1: UPC Search
      console.log('\n=== TEST 1: UPC SEARCH ===');
      const upcResult = await this.testUpcSearch('764503063176');
      console.log(`UPC Results: ${upcResult.nbHits} hits, top match:`, 
        upcResult.hits[0] ? {
          title: upcResult.hits[0].title,
          sku: upcResult.hits[0].sku,
          upc: upcResult.hits[0].upc
        } : 'No results');

      // Test 2: MPN Search
      console.log('\n=== TEST 2: MPN SEARCH ===');
      const mpnResult = await this.testMpnSearch('ZP.19BG');
      console.log(`MPN Results: ${mpnResult.nbHits} hits, top match:`, 
        mpnResult.hits[0] ? {
          title: mpnResult.hits[0].title,
          sku: mpnResult.hits[0].sku
        } : 'No results');

      // Test 3: Filtered UPC Search
      console.log('\n=== TEST 3: FILTERED UPC SEARCH ===');
      const filteredResult = await this.testFilteredSearch('764503063176', {
        categoryName: 'Handguns'
      });
      console.log(`Filtered Results: ${filteredResult.nbHits} hits`);

      // Test 4: General search quality check
      console.log('\n=== TEST 4: GENERAL SEARCH QUALITY ===');
      const generalResult = await this.testMpnSearch('glock');
      console.log(`General search results: ${generalResult.nbHits} hits`);

      console.log('\n✅ Test suite completed successfully!');

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }
}

export const algoliaSearchTest = new AlgoliaSearchTestService();