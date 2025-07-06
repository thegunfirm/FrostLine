import { db } from "../db";
import { searchCache, searchLearning, searchFeedback, systemSettings } from "../../shared/schema";
import { eq, and, desc, sql, gt } from "drizzle-orm";

/**
 * AI-Powered Search Learning System
 * Learns from user searches and provides intelligent synonym matching
 * Caches common searches and expands queries with learned patterns
 */

interface SearchExpansion {
  synonyms: string[];
  relatedTerms: string[];
  categoryHints: string[];
  brandMappings: string[];
}

interface CachedSearchResult {
  query: string;
  expandedQuery: string;
  results: any[];
  metadata: {
    totalResults: number;
    avgRelevanceScore: number;
    popularFilters: string[];
    timestamp: Date;
  };
}

export class AISearchLearning {
  private static instance: AISearchLearning;
  private synonymMap: Map<string, string[]> = new Map();
  private colorExpansions: Map<string, string[]> = new Map();
  private brandMappings: Map<string, string[]> = new Map();
  private lastLearningUpdate: Date = new Date(0);

  static getInstance(): AISearchLearning {
    if (!AISearchLearning.instance) {
      AISearchLearning.instance = new AISearchLearning();
    }
    return AISearchLearning.instance;
  }

  /**
   * Initialize the AI learning system with built-in knowledge
   */
  async initialize(): Promise<void> {
    // Color and finish mappings
    this.colorExpansions.set('pink', ['pink', 'rose', 'magenta', 'salmon', 'coral']);
    this.colorExpansions.set('purple', ['purple', 'violet', 'plum', 'lavender', 'magenta']);
    this.colorExpansions.set('rose gold', ['rose gold', 'copper', 'bronze', 'champagne', 'pink gold']);
    this.colorExpansions.set('black', ['black', 'matte black', 'tactical black', 'midnight']);
    this.colorExpansions.set('tan', ['tan', 'fde', 'flat dark earth', 'coyote', 'desert tan']);
    this.colorExpansions.set('od green', ['od green', 'olive drab', 'military green', 'forest green']);

    // Brand synonym mappings
    this.brandMappings.set('sw', ['smith & wesson', 'smith and wesson', 's&w']);
    this.brandMappings.set('hk', ['heckler & koch', 'heckler and koch', 'h&k']);
    this.brandMappings.set('fn', ['fn america', 'fn herstal', 'fabrique nationale']);
    this.brandMappings.set('sig', ['sig sauer', 'sigarms', 'sig arms']);
    this.brandMappings.set('cz', ['cz usa', 'ceska zbrojovka', 'czech republic']);

    // Common firearms terminology
    this.synonymMap.set('pistol', ['pistol', 'handgun', 'sidearm', 'firearm']);
    this.synonymMap.set('rifle', ['rifle', 'long gun', 'carbine', 'firearm']);
    this.synonymMap.set('shotgun', ['shotgun', 'scattergun', 'fowling piece']);
    this.synonymMap.set('scope', ['scope', 'optic', 'sight', 'glass', 'riflescope']);
    this.synonymMap.set('magazine', ['magazine', 'mag', 'clip', 'feed']);
    this.synonymMap.set('suppressor', ['suppressor', 'silencer', 'can', 'muzzle device']);
    this.synonymMap.set('holster', ['holster', 'carry gear', 'retention system']);

    // Load learned patterns from database
    await this.loadLearnedPatterns();
  }

  /**
   * Expand a search query with AI-learned synonyms and related terms
   */
  async expandQuery(originalQuery: string): Promise<string> {
    if (!originalQuery.trim()) return originalQuery;

    const normalizedQuery = originalQuery.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    const expandedTerms: Set<string> = new Set([originalQuery]);

    // Check cache first
    const cached = await this.getCachedExpansion(normalizedQuery);
    if (cached) {
      return cached.expandedQuery;
    }

    // Apply color expansions
    for (const [color, variations] of this.colorExpansions) {
      if (normalizedQuery.includes(color)) {
        variations.forEach(variant => {
          expandedTerms.add(originalQuery.replace(new RegExp(color, 'gi'), variant));
        });
      }
    }

    // Apply brand mappings
    for (const [shortForm, fullForms] of this.brandMappings) {
      if (words.some(word => word === shortForm)) {
        fullForms.forEach(fullForm => {
          expandedTerms.add(originalQuery.replace(new RegExp(`\\b${shortForm}\\b`, 'gi'), fullForm));
        });
      }
    }

    // Apply synonym expansions
    for (const word of words) {
      const synonyms = this.synonymMap.get(word);
      if (synonyms) {
        synonyms.forEach(synonym => {
          if (synonym !== word) {
            expandedTerms.add(originalQuery.replace(new RegExp(`\\b${word}\\b`, 'gi'), synonym));
          }
        });
      }
    }

    // Apply learned patterns
    const learnedExpansions = await this.getLearnedExpansions(normalizedQuery);
    learnedExpansions.forEach(expansion => expandedTerms.add(expansion));

    const expandedQuery = Array.from(expandedTerms).join(' OR ');
    
    // Cache the expansion
    await this.cacheExpansion(normalizedQuery, expandedQuery);
    
    return expandedQuery;
  }

  /**
   * Record a successful search interaction for learning
   */
  async recordSearchSuccess(query: string, results: any[], userInteractions: string[]): Promise<void> {
    try {
      await db.insert(searchLearning).values({
        originalQuery: query.toLowerCase().trim(),
        expandedQuery: await this.expandQuery(query),
        resultCount: results.length,
        userInteractions: JSON.stringify(userInteractions),
        relevanceScore: this.calculateRelevanceScore(results, userInteractions),
        timestamp: new Date(),
        learningData: JSON.stringify({
          topCategories: this.extractTopCategories(results),
          topBrands: this.extractTopBrands(results),
          priceRanges: this.extractPriceRanges(results)
        })
      });
    } catch (error) {
      console.error('Failed to record search success:', error);
    }
  }

  /**
   * Record user feedback for search improvement
   */
  async recordSearchFeedback(query: string, feedback: string, category?: string): Promise<void> {
    try {
      await db.insert(searchFeedback).values({
        searchQuery: query.toLowerCase().trim(),
        feedbackText: feedback,
        category: category || null,
        timestamp: new Date(),
        isResolved: false
      });

      // Analyze feedback for learning opportunities
      await this.analyzeFeedbackForLearning(query, feedback);
    } catch (error) {
      console.error('Failed to record search feedback:', error);
    }
  }

  /**
   * Get cached search expansion
   */
  private async getCachedExpansion(query: string): Promise<CachedSearchResult | null> {
    try {
      const cached = await db.select()
        .from(searchCache)
        .where(eq(searchCache.originalQuery, query))
        .limit(1);

      if (cached.length > 0) {
        const cache = cached[0];
        const cacheAge = Date.now() - cache.timestamp.getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (cacheAge < maxAge) {
          return {
            query: cache.originalQuery,
            expandedQuery: cache.expandedQuery,
            results: JSON.parse(cache.results),
            metadata: JSON.parse(cache.metadata)
          };
        }
      }
    } catch (error) {
      console.error('Failed to get cached expansion:', error);
    }
    return null;
  }

  /**
   * Cache search expansion
   */
  private async cacheExpansion(originalQuery: string, expandedQuery: string): Promise<void> {
    try {
      await db.insert(searchCache).values({
        originalQuery,
        expandedQuery,
        results: JSON.stringify([]),
        metadata: JSON.stringify({
          timestamp: new Date(),
          hitCount: 0,
          avgRelevance: 0
        }),
        timestamp: new Date()
      }).onConflictDoUpdate({
        target: searchCache.originalQuery,
        set: {
          expandedQuery,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to cache expansion:', error);
    }
  }

  /**
   * Load learned patterns from database
   */
  private async loadLearnedPatterns(): Promise<void> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const recentLearning = await db.select()
        .from(searchLearning)
        .where(gt(searchLearning.timestamp, oneWeekAgo))
        .orderBy(desc(searchLearning.relevanceScore))
        .limit(1000);

      // Analyze patterns and update synonym maps
      for (const learning of recentLearning) {
        const originalWords = learning.originalQuery.split(/\s+/);
        const expandedWords = learning.expandedQuery.split(/\s+/);
        
        // Find successful expansions
        if (learning.relevanceScore > 0.7 && learning.resultCount > 0) {
          // Add to synonym map if not already present
          for (const word of originalWords) {
            if (!this.synonymMap.has(word)) {
              this.synonymMap.set(word, [word]);
            }
          }
        }
      }

      this.lastLearningUpdate = new Date();
    } catch (error) {
      console.error('Failed to load learned patterns:', error);
    }
  }

  /**
   * Get learned expansions for a query
   */
  private async getLearnedExpansions(query: string): Promise<string[]> {
    try {
      const similar = await db.select()
        .from(searchLearning)
        .where(
          and(
            sql`similarity(${searchLearning.originalQuery}, ${query}) > 0.3`,
            gt(searchLearning.relevanceScore, 0.6)
          )
        )
        .orderBy(desc(searchLearning.relevanceScore))
        .limit(10);

      return similar.map(s => s.expandedQuery).filter(Boolean);
    } catch (error) {
      console.error('Failed to get learned expansions:', error);
      return [];
    }
  }

  /**
   * Analyze feedback for learning opportunities
   */
  private async analyzeFeedbackForLearning(query: string, feedback: string): Promise<void> {
    const feedbackWords = feedback.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);

    // Look for potential synonyms in feedback
    for (const feedbackWord of feedbackWords) {
      if (feedbackWord.length > 2 && !queryWords.includes(feedbackWord)) {
        // This could be a synonym or related term
        for (const queryWord of queryWords) {
          if (queryWord.length > 2) {
            const existingSynonyms = this.synonymMap.get(queryWord) || [queryWord];
            if (!existingSynonyms.includes(feedbackWord)) {
              existingSynonyms.push(feedbackWord);
              this.synonymMap.set(queryWord, existingSynonyms);
            }
          }
        }
      }
    }
  }

  /**
   * Calculate relevance score based on results and user interactions
   */
  private calculateRelevanceScore(results: any[], userInteractions: string[]): number {
    if (results.length === 0) return 0;
    
    let score = Math.min(results.length / 10, 1.0); // Base score from result count
    
    // Boost score based on user interactions
    if (userInteractions.includes('click')) score += 0.3;
    if (userInteractions.includes('add_to_cart')) score += 0.4;
    if (userInteractions.includes('view_details')) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Extract top categories from search results
   */
  private extractTopCategories(results: any[]): string[] {
    const categories = new Map<string, number>();
    
    results.forEach(result => {
      if (result.categoryName) {
        categories.set(result.categoryName, (categories.get(result.categoryName) || 0) + 1);
      }
    });
    
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
  }

  /**
   * Extract top brands from search results
   */
  private extractTopBrands(results: any[]): string[] {
    const brands = new Map<string, number>();
    
    results.forEach(result => {
      if (result.manufacturerName) {
        brands.set(result.manufacturerName, (brands.get(result.manufacturerName) || 0) + 1);
      }
    });
    
    return Array.from(brands.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand);
  }

  /**
   * Extract price ranges from search results
   */
  private extractPriceRanges(results: any[]): string[] {
    const ranges = ['0-100', '100-500', '500-1000', '1000+'];
    const rangeCounts = new Map<string, number>();
    
    results.forEach(result => {
      if (result.tierPricing?.bronze) {
        const price = result.tierPricing.bronze;
        if (price < 100) rangeCounts.set('0-100', (rangeCounts.get('0-100') || 0) + 1);
        else if (price < 500) rangeCounts.set('100-500', (rangeCounts.get('100-500') || 0) + 1);
        else if (price < 1000) rangeCounts.set('500-1000', (rangeCounts.get('500-1000') || 0) + 1);
        else rangeCounts.set('1000+', (rangeCounts.get('1000+') || 0) + 1);
      }
    });
    
    return Array.from(rangeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([range]) => range);
  }

  /**
   * Get search analytics for admin dashboard
   */
  async getSearchAnalytics(): Promise<any> {
    try {
      const totalSearches = await db.select({ count: sql<number>`count(*)` })
        .from(searchLearning);

      const topQueries = await db.select({
        query: searchLearning.originalQuery,
        count: sql<number>`count(*)`,
        avgRelevance: sql<number>`avg(${searchLearning.relevanceScore})`
      })
        .from(searchLearning)
        .groupBy(searchLearning.originalQuery)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      const recentFeedback = await db.select()
        .from(searchFeedback)
        .orderBy(desc(searchFeedback.timestamp))
        .limit(20);

      return {
        totalSearches: totalSearches[0]?.count || 0,
        topQueries,
        recentFeedback,
        synonymCount: this.synonymMap.size,
        lastLearningUpdate: this.lastLearningUpdate
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return null;
    }
  }
}

export const aiSearchLearning = AISearchLearning.getInstance();