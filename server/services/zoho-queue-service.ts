import { EventEmitter } from 'events';

export interface QueuedRequest {
  id: string;
  operation: string;
  payload: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

export class ZohoQueueService extends EventEmitter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly requestInterval = 1000; // 1 second between requests
  private readonly maxConcurrency = 1; // Serialize all requests
  private backoffDelays = [1000, 2000, 4000, 8000, 16000, 32000, 60000]; // Up to 60s

  constructor() {
    super();
    this.startProcessing();
  }

  public async enqueue<T>(
    operation: string,
    payload: any,
    maxRetries = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        operation,
        payload,
        resolve,
        reject,
        retryCount: 0,
        maxRetries,
        createdAt: new Date(),
      };

      this.queue.push(request);
      this.emit('queueUpdate', {
        queueLength: this.queue.length,
        operation: 'enqueue',
        requestId: request.id,
      });

      // If queue is getting long, emit warning
      if (this.queue.length > 50) {
        this.emit('highLoad', { queueLength: this.queue.length });
      }
    });
  }

  private async startProcessing() {
    if (this.processing) return;
    this.processing = true;

    while (true) {
      if (this.queue.length === 0) {
        await this.sleep(100); // Check every 100ms for new requests
        continue;
      }

      const request = this.queue.shift()!;
      
      try {
        // Rate limiting - ensure minimum interval between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestInterval) {
          await this.sleep(this.requestInterval - timeSinceLastRequest);
        }

        // Process the request
        const result = await this.processRequest(request);
        this.lastRequestTime = Date.now();
        
        request.resolve(result);
        
        this.emit('requestCompleted', {
          requestId: request.id,
          operation: request.operation,
          queueLength: this.queue.length,
        });

      } catch (error) {
        await this.handleRequestError(request, error);
      }
    }
  }

  private async processRequest(request: QueuedRequest): Promise<any> {
    // This will be implemented by the specific service using this queue
    this.emit('processRequest', request);
    
    // The actual processing will be handled by the ZohoService
    // This is just the queue management layer
    throw new Error('processRequest must be overridden by implementing service');
  }

  private async handleRequestError(request: QueuedRequest, error: any) {
    const isRateLimited = this.isRateLimitError(error);
    const shouldRetry = request.retryCount < request.maxRetries;

    if (isRateLimited && shouldRetry) {
      // Exponential backoff for rate limiting
      const backoffDelay = this.getBackoffDelay(request.retryCount, error);
      
      this.emit('rateLimitBackoff', {
        requestId: request.id,
        operation: request.operation,
        retryCount: request.retryCount,
        backoffDelay,
        nextRetryAt: new Date(Date.now() + backoffDelay),
      });

      // Wait for backoff period
      await this.sleep(backoffDelay);
      
      // Retry the request
      request.retryCount++;
      this.queue.unshift(request); // Put back at front of queue
      
    } else if (shouldRetry && !isRateLimited) {
      // Regular retry with shorter delay
      await this.sleep(1000);
      request.retryCount++;
      this.queue.unshift(request);
      
    } else {
      // Max retries exceeded or non-retryable error
      this.emit('requestFailed', {
        requestId: request.id,
        operation: request.operation,
        error: error.message,
        retryCount: request.retryCount,
      });
      
      request.reject(error);
    }
  }

  private isRateLimitError(error: any): boolean {
    if (error.status === 429) return true;
    if (error.statusCode === 429) return true;
    
    const errorMessage = error.message?.toLowerCase() || '';
    return errorMessage.includes('too many requests') ||
           errorMessage.includes('rate limit') ||
           errorMessage.includes('access denied');
  }

  private getBackoffDelay(retryCount: number, error: any): number {
    // Check for Retry-After header
    const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
    if (retryAfter) {
      const delay = parseInt(retryAfter) * 1000; // Convert to milliseconds
      return Math.min(delay, 60000); // Cap at 60 seconds
    }

    // Use exponential backoff with jitter
    const baseDelay = this.backoffDelays[Math.min(retryCount, this.backoffDelays.length - 1)];
    const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
    return Math.floor(baseDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      lastRequestTime: this.lastRequestTime,
    };
  }

  public clearQueue() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.emit('queueCleared');
  }
}