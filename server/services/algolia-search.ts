import { algoliasearch } from 'algoliasearch';
import { RSRProduct } from './rsr-api';

export interface AlgoliaProduct {
  objectID: string;
  title: string;
  name: string;
  description: string;
  fullDescription: string;
  sku: string;
  upc: string;
  manufacturerName: string;
  categoryName: string;
  subcategoryName: string;
  // Flat pricing structure that matches settings
  tierPricing: {
    bronze: number;
    gold: number;
    platinum: number;
  };
  retailPrice: number;
  msrp: number;
  dealerPrice: number;
  // Inventory fields
  inStock: boolean;
  inventoryQuantity: number;
  dropShippable: boolean;
  // Product attributes for filtering
  caliber?: string;
  actionType?: string;
  barrelLength?: string;
  capacity?: string;
  finish?: string;
  frameSize?: string;
  sightType?: string;
  newItem: boolean;
  // Ranking fields
  popularityScore: number;
  isCompleteFirearm?: boolean;
  isActive: boolean;
  // Search enhancement
  searchableText: string;
  tags: string[];
  images: Array<{
    image: string;
    id: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

class AlgoliaSearchService {
  private client: any;
  private index: any;
  private adminClient: any;
  private adminIndex: any;

  constructor() {
    const appId = process.env.ALGOLIA_APP_ID || '';
    const apiKey = process.env.ALGOLIA_API_KEY || '';
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || '';

    if (!appId || !apiKey) {
      throw new Error('Algolia credentials not configured');
    }

    // Search client for read operations
    this.client = algoliasearch(appId, apiKey);
    this.index = 'products';

    // Admin client for write operations
    if (adminApiKey) {
      this.adminClient = algoliasearch(appId, adminApiKey);
      this.adminIndex = 'products';
    }
  }

  // Check if product is a complete handgun vs component
  private isCompleteHandgun(name: string): boolean {
    const componentKeywords = [
      'slide', 'barrel', 'frame', 'grip', 'trigger', 'sight', 'magazine',
      'mag', 'spring', 'pin', 'screw', 'bolt', 'carrier', 'guide',
      'assembly', 'kit', 'part', 'component', 'replacement', 'upgrade',
      'accessory', 'mount', 'rail', 'laser', 'light', 'holster',
      'case', 'bag', 'cleaning', 'tool', 'lubricant', 'oil'
    ];
    
    const nameWords = name.toLowerCase().split(/\s+/);
    return !componentKeywords.some(keyword => 
      nameWords.some(word => word.includes(keyword))
    );
  }

  // Convert RSR product to Algolia format
  private rsrToAlgoliaProduct(rsrProduct: RSRProduct): AlgoliaProduct {
    // Extract caliber from product name
    const extractCaliber = (name: string): string | null => {
      const calibers = [
        { pattern: /9\s*mm|9mm/i, value: '9mm' },
        { pattern: /5\.56|556/i, value: '5.56 NATO' },
        { pattern: /\.22\s*LR|22\s*LR|22LR/i, value: '.22 LR' },
        { pattern: /12\s*GA|12\s*GAUGE/i, value: '12 Gauge' },
        { pattern: /\.45\s*ACP|45\s*ACP|45ACP/i, value: '.45 ACP' },
        { pattern: /\.38\s*SPECIAL|38\s*SPECIAL/i, value: '.38 Special' },
        { pattern: /\.308|308\s*WIN/i, value: '.308 Win' },
        { pattern: /7\.62|762/i, value: '7.62x39' },
        { pattern: /\.357|357\s*MAG/i, value: '.357 Magnum' },
        { pattern: /\.223|223\s*REM/i, value: '.223 Rem' },
        { pattern: /20\s*GA|20\s*GAUGE/i, value: '20 Gauge' },
        { pattern: /\.410|410\s*BORE/i, value: '.410 Bore' },
        { pattern: /\.270|270\s*WIN/i, value: '.270 Win' },
        { pattern: /\.40|40\s*S&W|40SW/i, value: '.40 S&W' },
        { pattern: /30-06|3006/i, value: '30-06' }
      ];
      
      for (const caliber of calibers) {
        if (caliber.pattern.test(name)) {
          return caliber.value;
        }
      }
      return null;
    };

    // Extract action type from product name
    const extractActionType = (name: string): string | null => {
      if (/SEMI\s*AUTO|SEMI-AUTO/i.test(name)) return 'Semi-Auto';
      if (/BOLT\s*ACTION|BOLT/i.test(name)) return 'Bolt Action';
      if (/PUMP\s*ACTION|PUMP/i.test(name)) return 'Pump Action';
      if (/LEVER\s*ACTION|LEVER/i.test(name)) return 'Lever Action';
      if (/SINGLE\s*ACTION/i.test(name)) return 'Single Action';
      if (/DOUBLE\s*ACTION/i.test(name)) return 'Double Action';
      if (/BREAK\s*ACTION|BREAK/i.test(name)) return 'Break Action';
      return null;
    };

    // Extract barrel length category
    const extractBarrelLength = (name: string): string | null => {
      const barrelMatch = name.match(/(\d+(?:\.\d+)?)\s*["\s*INCH|IN]/i);
      if (barrelMatch) {
        const length = parseFloat(barrelMatch[1]);
        if (length < 16) return 'Under 16"';
        if (length <= 20) return '16"-20"';
        if (length <= 24) return '20"-24"';
        return '24"+';
      }
      if (/PISTOL|HANDGUN/i.test(name)) return 'Pistol Length';
      return null;
    };

    // Extract capacity category
    const extractCapacity = (name: string): string | null => {
      const capacityMatch = name.match(/(\d+)\s*(?:RD|ROUND|SHOT)/i);
      if (capacityMatch) {
        const capacity = parseInt(capacityMatch[1]);
        if (capacity <= 5) return '1-5 rounds';
        if (capacity <= 10) return '6-10 rounds';
        if (capacity <= 15) return '11-15 rounds';
        if (capacity <= 30) return '16-30 rounds';
        return '30+ rounds';
      }
      return null;
    };

    const caliber = extractCaliber(rsrProduct.description);
    const actionType = extractActionType(rsrProduct.description);
    const barrelLength = extractBarrelLength(rsrProduct.description);
    const capacity = extractCapacity(rsrProduct.description);

    const tags = [
      rsrProduct.categoryDesc,
      rsrProduct.manufacturer,
      rsrProduct.departmentDesc,
      rsrProduct.subDepartmentDesc,
      caliber,
      actionType,
      barrelLength,
      capacity
    ].filter(Boolean);

    if (rsrProduct.newItem) tags.push('New');
    if (rsrProduct.promo) tags.push('Promo');
    if (rsrProduct.allocated === 'Y') tags.push('Allocated');

    const searchableText = [
      rsrProduct.description,
      rsrProduct.fullDescription,
      rsrProduct.additionalDesc,
      rsrProduct.manufacturer,
      rsrProduct.mfgName,
      rsrProduct.mfgPartNumber,
      rsrProduct.categoryDesc,
      rsrProduct.accessories,
      caliber,
      actionType,
      barrelLength,
      capacity
    ].filter(Boolean).join(' ');

    // Determine if this is a complete handgun for ranking boost
    const isCompleteHandgun = this.isCompleteHandgun(rsrProduct.description);
    
    // Calculate popularity score for ranking
    const popularityScore = this.getPopularityScore({
      name: rsrProduct.description,
      manufacturer: rsrProduct.manufacturer,
      category: rsrProduct.categoryDesc
    });

    // Create flat pricing structure that matches settings expectations
    const retailPrice = rsrProduct.retailPrice || 0;
    const dealerPrice = rsrProduct.rsrPrice || 0;
    const msrp = rsrProduct.retailPrice || 0;
    
    // Map RSR prices to tier structure (using best available mapping)
    const tierPricing = {
      bronze: retailPrice, // Use retail price for bronze tier
      gold: Math.max(dealerPrice * 1.15, retailPrice * 0.9), // Gold between dealer and retail
      platinum: dealerPrice // Use dealer price for platinum (lowest)
    };

    return {
      objectID: rsrProduct.stockNo,
      title: rsrProduct.description,
      name: rsrProduct.description, // Add name field
      description: rsrProduct.fullDescription || rsrProduct.description,
      fullDescription: rsrProduct.fullDescription || rsrProduct.description,
      sku: rsrProduct.mfgPartNumber || rsrProduct.stockNo,
      upc: rsrProduct.upc || '',
      manufacturerName: rsrProduct.manufacturer || rsrProduct.mfgName || '',
      categoryName: rsrProduct.categoryDesc || '',
      subcategoryName: rsrProduct.subDepartmentDesc || '',
      // FLAT pricing structure that matches settings
      tierPricing,
      retailPrice,
      msrp,
      dealerPrice,
      // Inventory fields
      inStock: (rsrProduct.quantity || 0) > 0,
      inventoryQuantity: rsrProduct.quantity || 0,
      dropShippable: true,
      // Product attributes for filtering
      caliber,
      actionType,
      barrelLength,
      capacity,
      newItem: rsrProduct.newItem || false,
      // Ranking fields
      popularityScore,
      isCompleteFirearm: isCompleteHandgun,
      isActive: true, // RSR products are always active when indexed
      // Enhanced search
      searchableText,
      tags,
      images: rsrProduct.imgName ? [{
        image: `/api/image/${rsrProduct.stockNo}`, // Use our image API
        id: rsrProduct.imgName
      }] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Index RSR products in Algolia
  async indexProducts(rsrProducts: RSRProduct[]): Promise<void> {
    if (!this.adminClient) {
      throw new Error('Admin API key required for indexing');
    }

    const algoliaProducts = rsrProducts.map(product => this.rsrToAlgoliaProduct(product));
    
    try {
      await this.adminClient.saveObjects({
        indexName: this.adminIndex,
        objects: algoliaProducts
      });
      console.log(`Indexed ${algoliaProducts.length} products in Algolia`);
    } catch (error) {
      console.error('Error indexing products in Algolia:', error);
      throw error;
    }
  }

  // Configure search settings
  async configureSearchSettings(): Promise<void> {
    if (!this.adminClient) {
      throw new Error('Admin API key required for configuration');
    }

    const settings = {
      searchableAttributes: [
        'name,description',
        'fullDescription',
        'manufacturer',
        'sku', // Customer-facing SKU (corrected manufacturer part number)
        'mfgPartNumber', // Original manufacturer part number for backward compatibility
        'category',
        'subCategory',
        'upc',
        'searchableText'
      ],
      attributesForFaceting: [
        'filterOnly(categoryName)',
        'filterOnly(manufacturerName)',
        'filterOnly(inStock)',
        'filterOnly(newItem)',
        'filterOnly(caliber)',
        'filterOnly(actionType)',
        'filterOnly(barrelLength)',
        'filterOnly(capacity)',
        'filterOnly(finish)',
        'filterOnly(frameSize)',
        'filterOnly(sightType)',
        'filterOnly(internalSpecial)',
        'filterOnly(dropShippable)',
        'filterOnly(platformCategory)',
        'filterOnly(partTypeCategory)',
        'filterOnly(nfaItemType)',
        'filterOnly(barrelLengthNFA)',
        'filterOnly(finishNFA)',
        'filterOnly(accessoryType)',
        'filterOnly(compatibility)',
        'filterOnly(material)',
        'filterOnly(mountType)',
        'filterOnly(receiverType)',
        'filterOnly(tierPricing.platinum)',
        'filterOnly(tags)'
      ],
      // CRITICAL FIX: Add sortableAttributes for price sorting
      sortableAttributes: [
        'tierPricing.platinum',
        'tierPricing.gold', 
        'tierPricing.bronze',
        'retailPrice',
        'msrp',
        'popularityScore'
      ],
      customRanking: [
        'desc(popularityScore)', // Boost popular handguns and rifles first
        'desc(isCompleteFirearm)',
        'desc(inStock)',
        'desc(newItem)',
        'asc(tierPricing.platinum)' // Use consistent platinum pricing
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      hitsPerPage: 24,
      maxValuesPerFacet: 100,
      ranking: [
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom'
      ]
    };

    try {
      await this.adminClient.setSettings({
        indexName: this.adminIndex,
        indexSettings: settings
      });
      console.log('Algolia search settings configured');
    } catch (error) {
      console.error('Error configuring Algolia settings:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(
    query: string,
    filters?: {
      category?: string;
      manufacturer?: string;
      inStock?: boolean;
      priceMin?: number;
      priceMax?: number;
      newItem?: boolean;
    },
    options?: {
      hitsPerPage?: number;
      page?: number;
      facets?: string[];
    }
  ): Promise<{ hits: AlgoliaProduct[]; nbHits: number; page: number; nbPages: number; facets?: any }> {
    const searchOptions: any = {
      hitsPerPage: options?.hitsPerPage || 24,
      page: options?.page || 0
    };

    // Build filters
    const filterParts: string[] = [];
    
    // CRITICAL: Always filter for active products only
    filterParts.push('isActive:true');
    
    if (filters?.category) {
      filterParts.push(`category:"${filters.category}"`);
    }
    if (filters?.manufacturer) {
      filterParts.push(`manufacturer:"${filters.manufacturer}"`);
    }
    if (filters?.inStock !== undefined) {
      filterParts.push(`inStock:${filters.inStock}`);
    }
    if (filters?.priceMin !== undefined) {
      filterParts.push(`retailPrice >= ${filters.priceMin}`);
    }
    if (filters?.priceMax !== undefined) {
      filterParts.push(`retailPrice <= ${filters.priceMax}`);
    }
    if (filters?.newItem !== undefined) {
      filterParts.push(`newItem:${filters.newItem}`);
    }

    if (filterParts.length > 0) {
      searchOptions.filters = filterParts.join(' AND ');
    }

    // Add facets for filtering
    if (options?.facets) {
      searchOptions.facets = options.facets;
    }

    try {
      const result = await this.client.searchSingleIndex({
        indexName: this.index,
        searchParams: {
          query,
          ...searchOptions
        }
      });
      return {
        hits: result.hits,
        nbHits: result.nbHits,
        page: result.page,
        nbPages: result.nbPages,
        facets: result.facets
      };
    } catch (error) {
      console.error('Error searching Algolia:', error);
      throw error;
    }
  }

  // Get product by stock number
  async getProduct(stockNo: string): Promise<AlgoliaProduct | null> {
    try {
      const result = await this.client.getObject({
        indexName: this.index,
        objectID: stockNo
      });
      return result as AlgoliaProduct;
    } catch (error) {
      console.error('Error getting product from Algolia:', error);
      return null;
    }
  }

  // Get search analytics (for AI learning)
  async getSearchAnalytics(startDate: string, endDate: string): Promise<any> {
    if (!this.adminClient) {
      throw new Error('Admin API key required for analytics');
    }

    try {
      // Note: This would require Algolia Analytics API
      // For now, we'll return placeholder for future implementation
      return {
        topQueries: [],
        noResultsQueries: [],
        clickThroughRate: 0,
        conversionRate: 0
      };
    } catch (error) {
      console.error('Error getting search analytics:', error);
      return null;
    }
  }

  // Index corrected database products to Algolia (preferred method)
  async indexDatabaseProducts(dbProducts: any[]): Promise<void> {
    if (!this.adminClient) {
      throw new Error('Admin API key required for indexing');
    }

    // CLEAR existing index first to remove old cached data
    try {
      await this.adminClient.clearObjects({
        indexName: this.adminIndex
      });
      console.log('🧹 Cleared existing Algolia index');
    } catch (error) {
      console.error('Warning: Could not clear existing index:', error);
    }

    const algoliaProducts = dbProducts.map(product => this.dbToAlgoliaProduct(product));
    
    try {
      await this.adminClient.saveObjects({
        indexName: this.adminIndex,
        objects: algoliaProducts
      });
      console.log(`✅ Indexed ${algoliaProducts.length} corrected database products in Algolia`);
    } catch (error) {
      console.error('Error indexing database products in Algolia:', error);
      throw error;
    }
  }

  // Calculate popularity score for handguns and rifles
  private getPopularityScore(product: any): number {
    const name = (product.name || '').toLowerCase();
    const manufacturer = (product.manufacturer || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    
    let popularityScore = 0;
    
    // Popular Handgun Brands & Models
    if (category.includes('handgun') || name.includes('pistol')) {
      if (manufacturer.includes('glock') || name.includes('glock')) {
        popularityScore += 100; // Glock is extremely popular
      }
      if (manufacturer.includes('smith') || manufacturer.includes('wesson') || name.includes('smith')) {
        popularityScore += 90; // S&W very popular
      }
      if (manufacturer.includes('sig') || name.includes('sig sauer')) {
        popularityScore += 85; // Sig Sauer very popular
      }
      if (manufacturer.includes('ruger') || name.includes('ruger')) {
        popularityScore += 80; // Ruger popular
      }
      if (manufacturer.includes('springfield') || name.includes('springfield')) {
        popularityScore += 75; // Springfield popular
      }
      if (manufacturer.includes('cz') || name.includes('cz')) {
        popularityScore += 70; // CZ popular
      }
      if (name.includes('1911') || name.includes('m1911')) {
        popularityScore += 85; // 1911 platform very popular
      }
      if (name.includes('p320') || name.includes('p365')) {
        popularityScore += 90; // Popular Sig models
      }
      if (name.includes('g19') || name.includes('g17') || name.includes('g43')) {
        popularityScore += 95; // Popular Glock models
      }
    }
    
    // Popular Rifle Brands & Models  
    if (category.includes('rifle') || name.includes('rifle')) {
      if (name.includes('ar-15') || name.includes('ar15') || name.includes('m4')) {
        popularityScore += 100; // AR-15 platform extremely popular
      }
      if (manufacturer.includes('remington') || name.includes('remington')) {
        popularityScore += 85; // Remington very popular
      }
      if (manufacturer.includes('winchester') || name.includes('winchester')) {
        popularityScore += 80; // Winchester popular
      }
      if (manufacturer.includes('ruger') || name.includes('ruger')) {
        popularityScore += 75; // Ruger popular
      }
      if (manufacturer.includes('savage') || name.includes('savage')) {
        popularityScore += 70; // Savage popular
      }
      if (name.includes('model 700') || name.includes('700')) {
        popularityScore += 85; // Popular Remington model
      }
      if (name.includes('10/22') || name.includes('1022')) {
        popularityScore += 90; // Very popular Ruger model
      }
      if (manufacturer.includes('daniel defense') || name.includes('daniel defense')) {
        popularityScore += 80; // Premium AR manufacturer
      }
      if (manufacturer.includes('bcm') || name.includes('bravo company')) {
        popularityScore += 75; // Quality AR manufacturer
      }
    }
    
    return popularityScore;
  }

  // Convert database product to Algolia format (with corrected field mapping)
  private dbToAlgoliaProduct(dbProduct: any): any {
    // Build searchable text including BOTH SKU and manufacturer part number
    const searchableText = [
      dbProduct.name,
      dbProduct.description,
      dbProduct.manufacturer,
      dbProduct.sku, // Customer-facing manufacturer part number
      dbProduct.manufacturerPartNumber, // Original manufacturer part number
      dbProduct.upcCode,
      dbProduct.category
    ].filter(Boolean).join(' ');
    
    // Calculate popularity score for ranking boost
    const popularityScore = this.getPopularityScore(dbProduct);

    return {
      objectID: dbProduct.sku || dbProduct.id, // Use SKU as primary ID for database products
      title: dbProduct.name, // Add title field that the frontend expects
      stockNumber: dbProduct.sku,
      rsrStockNumber: dbProduct.rsrStockNumber,
      name: dbProduct.name,
      description: dbProduct.description,
      fullDescription: dbProduct.description,
      categoryName: dbProduct.category, // Map to categoryName for consistency
      subcategoryName: dbProduct.subcategoryName,
      manufacturerName: dbProduct.manufacturer, // Map to manufacturerName for API consistency
      sku: dbProduct.sku, // Customer-facing SKU (corrected manufacturer part number)
      mpn: dbProduct.manufacturerPartNumber, // Map to mpn for API consistency
      upc: dbProduct.upcCode,
      // Simplified tier pricing structure matching what the API expects
      tierPricing: {
        bronze: parseFloat(dbProduct.priceBronze || '0'),
        gold: parseFloat(dbProduct.priceGold || '0'),
        platinum: parseFloat(dbProduct.pricePlatinum || '0')
      },
      retailPrice: parseFloat(dbProduct.priceBronze || '0'),
      msrp: parseFloat(dbProduct.priceMSRP || '0'),
      dealerPrice: parseFloat(dbProduct.pricePlatinum || '0'),
      weight: dbProduct.weight,
      inStock: dbProduct.inStock,
      inventoryQuantity: dbProduct.stockQuantity || 0,
      images: dbProduct.rsrStockNumber ? [{
        image: `/api/image/${dbProduct.rsrStockNumber}`,
        id: dbProduct.rsrStockNumber
      }] : [],
      fflRequired: dbProduct.requiresFFL,
      caliber: dbProduct.caliber,
      capacity: dbProduct.capacity,
      barrelLength: dbProduct.barrelLength,
      finish: dbProduct.finish,
      frameSize: dbProduct.frameSize,
      actionType: dbProduct.actionType,
      sightType: dbProduct.sightType,
      newItem: dbProduct.newItem || false,
      dropShippable: dbProduct.dropShippable !== false,
      isActive: dbProduct.isActive !== false, // CRITICAL: Include isActive for filtering
      popularityScore, // Add popularity boost for ranking
      searchableText, // Enhanced searchable text with both SKU and MPN
      tags: this.generateTags(dbProduct)
    };
  }

  // Generate tags for database products
  private generateTags(product: any): string[] {
    const tags = [];
    if (product.requiresFFL) tags.push('FFL Required');
    if (product.inStock) tags.push('In Stock');
    if (product.category) tags.push(product.category);
    if (product.manufacturer) tags.push(product.manufacturer);
    return tags;
  }

  // Update product inventory
  async updateProductInventory(stockNo: string, quantity: number, price?: number): Promise<void> {
    if (!this.adminIndex) {
      throw new Error('Admin API key required for updates');
    }

    const updates: any = {
      objectID: stockNo,
      quantity,
      inStock: quantity > 0
    };

    if (price !== undefined) {
      updates.rsrPrice = price;
    }

    try {
      await this.adminIndex.partialUpdateObject(updates);
    } catch (error) {
      console.error('Error updating product inventory in Algolia:', error);
      throw error;
    }
  }

  // Remove product from Algolia index (for deduplication)
  async removeProduct(objectID: string): Promise<void> {
    if (!this.adminIndex) {
      throw new Error('Admin API key required for deletions');
    }

    try {
      await this.adminIndex.deleteObject(objectID);
      console.log(`Removed product ${objectID} from Algolia index`);
    } catch (error) {
      console.error('Error removing product from Algolia:', error);
      throw error;
    }
  }

  // Mark product as inactive in Algolia (alternative to removal)
  async markProductInactive(objectID: string): Promise<void> {
    if (!this.adminIndex) {
      throw new Error('Admin API key required for updates');
    }

    try {
      await this.adminIndex.partialUpdateObject({
        objectID,
        isActive: false,
        inStock: false,
        quantity: 0,
        searchableText: '', // Clear searchable text to prevent search results
        _archived: true
      });
      console.log(`Marked product ${objectID} as inactive in Algolia index`);
    } catch (error) {
      console.error('Error marking product as inactive in Algolia:', error);
      throw error;
    }
  }
}

export const algoliaSearch = new AlgoliaSearchService();