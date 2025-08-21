import { algoliasearch } from 'algoliasearch';
import { RSRProduct } from './rsr-api';

export interface AlgoliaProduct {
  objectID: string;
  title: string;
  description: string;
  sku: string;
  upc: string;
  manufacturerName: string;
  categoryName: string;
  subcategoryName: string;
  inventory: {
    onHand: number;
    allocated: boolean;
    dropShippable: boolean;
  };
  price: {
    msrp: number;
    retailMap: number;
    dealerPrice: number;
    dealerCasePrice: number;
  };
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

    return {
      objectID: rsrProduct.stockNo,
      title: rsrProduct.description,
      description: rsrProduct.fullDescription || rsrProduct.description,
      sku: rsrProduct.mfgPartNumber || rsrProduct.stockNo,
      upc: rsrProduct.upc || '',
      manufacturerName: rsrProduct.manufacturer || rsrProduct.mfgName || '',
      categoryName: rsrProduct.categoryDesc || '',
      subcategoryName: rsrProduct.subDepartmentDesc || '',
      inventory: {
        onHand: rsrProduct.quantity || 0,
        allocated: rsrProduct.allocated === 'Y',
        dropShippable: true
      },
      price: {
        msrp: rsrProduct.retailPrice || 0,
        retailMap: rsrProduct.retailPrice || 0,
        dealerPrice: rsrProduct.rsrPrice || 0,
        dealerCasePrice: rsrProduct.rsrPrice || 0
      },
      images: rsrProduct.imgName ? [{
        image: `https://www.rsrgroup.com/images/inventory/${rsrProduct.imgName}`,
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
        'filterOnly(category)',
        'filterOnly(manufacturer)',
        'filterOnly(inStock)',
        'filterOnly(newItem)',
        'filterOnly(caliber)',
        'filterOnly(actionType)',
        'filterOnly(barrelLength)',
        'filterOnly(capacity)',
        'filterOnly(tags)'
      ],
      customRanking: [
        'desc(isCompleteFirearm)',
        'desc(inStock)',
        'desc(newItem)',
        'asc(retailPrice)'
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

    return {
      objectID: dbProduct.rsrStockNumber || dbProduct.id, // Use RSR stock number as primary ID
      stockNo: dbProduct.rsrStockNumber,
      name: dbProduct.name,
      description: dbProduct.description,
      fullDescription: dbProduct.description,
      category: dbProduct.category,
      subCategory: dbProduct.subCategory,
      manufacturer: dbProduct.manufacturer,
      sku: dbProduct.sku, // Customer-facing SKU (corrected manufacturer part number)
      mfgPartNumber: dbProduct.manufacturerPartNumber, // Original manufacturer part number for backward compatibility
      upc: dbProduct.upcCode,
      retailPrice: parseFloat(dbProduct.priceBronze || '0'),
      rsrPrice: parseFloat(dbProduct.pricePlatinum || '0'),
      weight: dbProduct.weight,
      inStock: dbProduct.inStock,
      quantity: dbProduct.quantity || 0,
      imageUrl: dbProduct.imageUrl || '',
      requiresFFL: dbProduct.requiresFFL,
      searchableText, // Enhanced searchable text with both SKU and MPN
      tags: this.generateTags(dbProduct),
      isCompleteFirearm: dbProduct.requiresFFL ? 1 : 0
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
}

export const algoliaSearch = new AlgoliaSearchService();