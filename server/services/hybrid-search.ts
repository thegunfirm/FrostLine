import { rsrAPI, RSRProduct } from './rsr-api';
import { algoliaSearch, AlgoliaProduct } from './algolia-search';
import { db } from '../db';
import { products, users } from '@shared/schema';
import { eq, and, ilike, or } from 'drizzle-orm';

export interface SearchAnalytics {
  query: string;
  userId?: number;
  resultCount: number;
  clickedResults: string[];
  timestamp: Date;
  searchSource: 'algolia' | 'rsr' | 'database';
  responseTime: number;
}

export interface SearchResult {
  id: string;
  stockNo: string;
  name: string;
  description: string;
  fullDescription: string;
  category: string;
  manufacturer: string;
  price: number;
  retailPrice: number;
  inStock: boolean;
  quantity: number;
  imageUrl: string;
  source: 'algolia' | 'rsr' | 'database';
  relevanceScore?: number;
}

export interface SearchOptions {
  query: string;
  category?: string;
  manufacturer?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  userId?: number;
}

class HybridSearchService {
  private searchAnalytics: SearchAnalytics[] = [];

  // Main search method that combines all sources
  async searchProducts(options: SearchOptions): Promise<{
    results: SearchResult[];
    totalCount: number;
    searchTime: number;
    sources: string[];
  }> {
    const startTime = Date.now();
    const sources: string[] = [];
    let results: SearchResult[] = [];

    try {
      // Step 1: Try Algolia first for fast results
      try {
        const algoliaResults = await this.searchWithAlgolia(options);
        if (algoliaResults.length > 0) {
          results = algoliaResults;
          sources.push('algolia');
        }
      } catch (error) {
        console.log('Algolia search failed, falling back to RSR API');
      }

      // Step 2: If Algolia has insufficient results, supplement with RSR API
      if (results.length < (options.limit || 24)) {
        try {
          const rsrResults = await this.searchWithRSR(options);
          if (rsrResults.length > 0) {
            // Merge results, avoiding duplicates
            const existingStockNos = new Set(results.map(r => r.stockNo));
            const newResults = rsrResults.filter(r => !existingStockNos.has(r.stockNo));
            results = [...results, ...newResults];
            sources.push('rsr');
          }
        } catch (error) {
          console.log('RSR API search failed, using database fallback');
        }
      }

      // Step 3: Database fallback if needed
      if (results.length === 0) {
        const dbResults = await this.searchWithDatabase(options);
        results = dbResults;
        sources.push('database');
      }

      const searchTime = Date.now() - startTime;

      // Record analytics for AI learning
      await this.recordSearchAnalytics({
        query: options.query,
        userId: options.userId,
        resultCount: results.length,
        clickedResults: [],
        timestamp: new Date(),
        searchSource: sources[0] as any,
        responseTime: searchTime
      });

      return {
        results: results.slice(0, options.limit || 24),
        totalCount: results.length,
        searchTime,
        sources
      };

    } catch (error) {
      console.error('Hybrid search error:', error);
      throw new Error('Search temporarily unavailable');
    }
  }

  // Search using Algolia
  private async searchWithAlgolia(options: SearchOptions): Promise<SearchResult[]> {
    const filters: any = {};
    if (options.category) filters.category = options.category;
    if (options.manufacturer) filters.manufacturer = options.manufacturer;
    if (options.inStock !== undefined) filters.inStock = options.inStock;
    if (options.priceMin) filters.priceMin = options.priceMin;
    if (options.priceMax) filters.priceMax = options.priceMax;

    const searchOptions = {
      hitsPerPage: options.limit || 24,
      page: Math.floor((options.offset || 0) / (options.limit || 24))
    };

    const algoliaResult = await algoliaSearch.searchProducts(options.query, filters, searchOptions);
    
    return algoliaResult.hits.map((hit: AlgoliaProduct) => ({
      id: hit.objectID,
      stockNo: hit.stockNo,
      name: hit.name,
      description: hit.description,
      fullDescription: hit.fullDescription,
      category: hit.category,
      manufacturer: hit.manufacturer,
      price: hit.rsrPrice,
      retailPrice: hit.retailPrice,
      inStock: hit.inStock,
      quantity: hit.quantity,
      imageUrl: hit.imageUrl,
      source: 'algolia' as const,
      relevanceScore: 1.0
    }));
  }

  // Search using RSR API
  private async searchWithRSR(options: SearchOptions): Promise<SearchResult[]> {
    const rsrResults = await rsrAPI.searchProducts(
      options.query,
      options.category,
      options.manufacturer
    );

    return rsrResults
      .filter(product => {
        if (options.inStock && product.quantity <= 0) return false;
        if (options.priceMin && product.retailPrice < options.priceMin) return false;
        if (options.priceMax && product.retailPrice > options.priceMax) return false;
        return true;
      })
      .map(product => ({
        id: product.stockNo,
        stockNo: product.stockNo,
        name: product.description,
        description: product.description,
        fullDescription: product.fullDescription,
        category: product.categoryDesc,
        manufacturer: product.manufacturer || product.mfgName,
        price: product.rsrPrice,
        retailPrice: product.retailPrice,
        inStock: product.quantity > 0,
        quantity: product.quantity,
        imageUrl: product.imgName ? `https://www.rsrgroup.com/images/inventory/${product.imgName}` : '',
        source: 'rsr' as const,
        relevanceScore: 0.8
      }))
      .slice(0, options.limit || 24);
  }

  // Search using local database
  private async searchWithDatabase(options: SearchOptions): Promise<SearchResult[]> {
    const conditions = [];
    
    if (options.query) {
      conditions.push(
        or(
          ilike(products.name, `%${options.query}%`),
          ilike(products.description, `%${options.query}%`),
          ilike(products.manufacturer, `%${options.query}%`)
        )
      );
    }

    if (options.category) {
      conditions.push(eq(products.category, options.category));
    }

    if (options.manufacturer) {
      conditions.push(eq(products.manufacturer, options.manufacturer));
    }

    if (options.inStock) {
      conditions.push(eq(products.inStock, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dbProducts = await db
      .select()
      .from(products)
      .where(whereClause)
      .limit(options.limit || 24)
      .offset(options.offset || 0);

    return dbProducts.map(product => ({
      id: product.id.toString(),
      stockNo: product.sku || '',
      name: product.name,
      description: product.description || '',
      fullDescription: product.description || '',
      category: product.category,
      manufacturer: product.manufacturer || '',
      price: parseFloat(product.priceBronze || product.priceWholesale || '0'),
      retailPrice: parseFloat(product.priceWholesale || '0'),
      inStock: product.inStock || false,
      quantity: product.stockQuantity || 0,
      imageUrl: product.images?.[0] || '',
      source: 'database' as const,
      relevanceScore: 0.6
    }));
  }

  // Record search analytics for AI learning
  async recordSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    this.searchAnalytics.push(analytics);
    
    // Keep only last 10,000 searches in memory
    if (this.searchAnalytics.length > 10000) {
      this.searchAnalytics = this.searchAnalytics.slice(-10000);
    }

    // TODO: Store in database for persistent AI learning
    // This would include user behavior patterns, search success rates, etc.
  }

  // Record when user clicks on a search result
  async recordClickThrough(searchQuery: string, clickedStockNo: string, userId?: number): Promise<void> {
    const recentSearch = this.searchAnalytics
      .reverse()
      .find(s => s.query === searchQuery && s.userId === userId);
    
    if (recentSearch) {
      recentSearch.clickedResults.push(clickedStockNo);
    }

    // TODO: Use this data for AI learning to improve search relevance
  }

  // Sync RSR catalog to Algolia (for initial setup and updates)
  async syncCatalogToAlgolia(): Promise<void> {
    try {
      console.log('Starting RSR catalog sync to Algolia...');
      const rsrProducts = await rsrAPI.getCatalog();
      
      if (rsrProducts.length > 0) {
        await algoliaSearch.indexProducts(rsrProducts);
        await algoliaSearch.configureSearchSettings();
        console.log(`Synced ${rsrProducts.length} products to Algolia`);
      }
    } catch (error) {
      console.error('Error syncing catalog to Algolia:', error);
      throw error;
    }
  }

  // Update inventory in real-time
  async updateInventory(): Promise<void> {
    try {
      const inventory = await rsrAPI.getInventory();
      
      for (const item of inventory) {
        await algoliaSearch.updateProductInventory(
          item.stockNo,
          item.quantity,
          item.rsrPrice
        );
      }
      
      console.log(`Updated inventory for ${inventory.length} products`);
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }

  // Get search analytics for AI learning insights
  getSearchAnalytics(): SearchAnalytics[] {
    return this.searchAnalytics;
  }

  // Get popular search terms
  getPopularSearchTerms(limit: number = 10): { query: string; count: number }[] {
    const queryCount = new Map<string, number>();
    
    this.searchAnalytics.forEach(analytics => {
      const current = queryCount.get(analytics.query) || 0;
      queryCount.set(analytics.query, current + 1);
    });

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Get search terms with no results (for content improvement)
  getNoResultQueries(): string[] {
    return this.searchAnalytics
      .filter(analytics => analytics.resultCount === 0)
      .map(analytics => analytics.query)
      .filter((query, index, array) => array.indexOf(query) === index);
  }
}

export const hybridSearch = new HybridSearchService();