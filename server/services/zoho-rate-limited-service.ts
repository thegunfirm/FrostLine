import { ZohoService } from '../zoho-service';
import { ZohoQueueService, QueuedRequest } from './zoho-queue-service';

export class ZohoRateLimitedService extends ZohoQueueService {
  private zohoService: ZohoService;
  private productCache = new Map<string, { id: string, cachedAt: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.zohoService = new ZohoService({
      clientId: process.env.ZOHO_WEBSERVICES_CLIENT_ID!,
      clientSecret: process.env.ZOHO_WEBSERVICES_CLIENT_SECRET!,
      redirectUri: "https://thegunfirm.com/api/zoho/callback",
      accountsHost: 'https://accounts.zoho.com',
      apiHost: 'https://www.zohoapis.com',
      accessToken: process.env.ZOHO_WEBSERVICES_ACCESS_TOKEN,
      refreshToken: process.env.ZOHO_WEBSERVICES_REFRESH_TOKEN
    });
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on('processRequest', (request: QueuedRequest) => {
      this.handleProcessRequest(request);
    });

    this.on('rateLimitBackoff', (data) => {
      console.log(`🔄 Rate limit backoff: ${data.operation} (retry ${data.retryCount + 1}) - waiting ${data.backoffDelay}ms`);
    });

    this.on('requestCompleted', (data) => {
      console.log(`✅ Completed: ${data.operation} (queue: ${data.queueLength})`);
    });

    this.on('requestFailed', (data) => {
      console.log(`❌ Failed: ${data.operation} after ${data.retryCount} retries - ${data.error}`);
    });

    this.on('highLoad', (data) => {
      console.log(`⚠️ High queue load: ${data.queueLength} requests pending`);
    });
  }

  private async handleProcessRequest(request: QueuedRequest) {
    try {
      let result;
      
      switch (request.operation) {
        case 'upsertProduct':
          result = await this.zohoService.upsertProduct(request.payload);
          // Cache the result
          if (result?.id && request.payload.Product_Code) {
            this.productCache.set(request.payload.Product_Code, {
              id: result.id,
              cachedAt: Date.now()
            });
          }
          break;
          
        case 'createDeal':
          result = await this.zohoService.createOrderDeal(request.payload);
          break;
          
        case 'createContact':
          result = await this.zohoService.createContact(request.payload);
          break;
          
        case 'updateDeal':
          result = await this.zohoService.makeAPIRequest(`Deals/${request.payload.id}`, 'PUT', { data: [request.payload.data] });
          break;
          
        default:
          throw new Error(`Unknown operation: ${request.operation}`);
      }
      
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Public methods that use the queue
  public async upsertProductSafe(productData: any): Promise<any> {
    // Check cache first
    const cached = this.productCache.get(productData.Product_Code);
    if (cached && (Date.now() - cached.cachedAt < this.cacheTimeout)) {
      console.log(`📦 Using cached product: ${productData.Product_Code} (${cached.id})`);
      return { id: cached.id, cached: true };
    }

    return this.enqueue('upsertProduct', productData);
  }

  public async createDealSafe(dealData: any): Promise<any> {
    return this.enqueue('createDeal', dealData);
  }

  public async createContactSafe(contactData: any): Promise<any> {
    return this.enqueue('createContact', contactData);
  }

  public async updateDealStatusSafe(dealId: string, status: string, additionalData?: any): Promise<any> {
    const updateData = {
      APP_Status: status,
      ...additionalData
    };

    return this.enqueue('updateDeal', {
      id: dealId,
      data: updateData
    });
  }

  public async updateDealWithBackoffStatus(dealId: string, nextRetryAt: Date): Promise<void> {
    try {
      await this.updateDealStatusSafe(dealId, `Queued – Zoho backoff (retry at ${nextRetryAt.toISOString()})`);
    } catch (error) {
      console.error('Failed to update deal with backoff status:', error);
    }
  }

  public async updateDealWithHighLoadStatus(dealId: string): Promise<void> {
    try {
      await this.updateDealStatusSafe(dealId, 'Queued – high load');
    } catch (error) {
      console.error('Failed to update deal with high load status:', error);
    }
  }

  public clearProductCache(): void {
    this.productCache.clear();
    console.log('🗑️ Product cache cleared');
  }

  public getProductCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(this.productCache.values())
      .filter(entry => now - entry.cachedAt < this.cacheTimeout);
    
    return {
      totalCached: this.productCache.size,
      validCached: validEntries.length,
      cacheTimeoutMs: this.cacheTimeout
    };
  }
}

// Global singleton instance
let rateLimitedServiceInstance: ZohoRateLimitedService | null = null;

export function getZohoRateLimitedService(): ZohoRateLimitedService {
  if (!rateLimitedServiceInstance) {
    rateLimitedServiceInstance = new ZohoRateLimitedService();
  }
  return rateLimitedServiceInstance;
}