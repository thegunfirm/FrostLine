const { algoliasearch } = require('algoliasearch');
import { RSRProduct } from './rsr-api';

export interface AlgoliaProduct {
  objectID: string;
  stockNo: string;
  name: string;
  description: string;
  fullDescription: string;
  category: string;
  subCategory: string;
  manufacturer: string;
  mfgPartNumber: string;
  upc: string;
  retailPrice: number;
  rsrPrice: number;
  weight: number;
  inStock: boolean;
  quantity: number;
  imageUrl: string;
  newItem: boolean;
  promo: string;
  allocated: string;
  accessories: string;
  searchableText: string;
  tags: string[];
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

  // Convert RSR product to Algolia format
  private rsrToAlgoliaProduct(rsrProduct: RSRProduct): AlgoliaProduct {
    const tags = [
      rsrProduct.categoryDesc,
      rsrProduct.manufacturer,
      rsrProduct.departmentDesc,
      rsrProduct.subDepartmentDesc
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
      rsrProduct.accessories
    ].filter(Boolean).join(' ');

    return {
      objectID: rsrProduct.stockNo,
      stockNo: rsrProduct.stockNo,
      name: rsrProduct.description,
      description: rsrProduct.description,
      fullDescription: rsrProduct.fullDescription,
      category: rsrProduct.categoryDesc,
      subCategory: rsrProduct.subDepartmentDesc,
      manufacturer: rsrProduct.manufacturer || rsrProduct.mfgName,
      mfgPartNumber: rsrProduct.mfgPartNumber,
      upc: rsrProduct.upc,
      retailPrice: rsrProduct.retailPrice,
      rsrPrice: rsrProduct.rsrPrice,
      weight: rsrProduct.weight,
      inStock: rsrProduct.quantity > 0,
      quantity: rsrProduct.quantity,
      imageUrl: rsrProduct.imgName ? `https://img.rsrgroup.com/highres-itemimages/${rsrProduct.imgName}` : '',
      newItem: rsrProduct.newItem,
      promo: rsrProduct.promo,
      allocated: rsrProduct.allocated,
      accessories: rsrProduct.accessories,
      searchableText,
      tags
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
        'mfgPartNumber',
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
        'filterOnly(tags)'
      ],
      customRanking: [
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