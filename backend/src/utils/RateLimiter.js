/**
 * RateLimiter - Token bucket algorithm for Jikan API rate limiting
 * Enforces: 3 requests per second, 60 requests per minute
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxTokensPerSecond = options.maxTokensPerSecond || 3;
    this.maxTokensPerMinute = options.maxTokensPerMinute || 60;

    // Token bucket for per-second limit
    this.secondBucket = {
      tokens: this.maxTokensPerSecond,
      lastRefill: Date.now(),
      refillInterval: 1000 // 1 second
    };

    // Token bucket for per-minute limit
    this.minuteBucket = {
      tokens: this.maxTokensPerMinute,
      lastRefill: Date.now(),
      refillInterval: 60000 // 1 minute
    };

    this.queue = [];
    this.processing = false;

    console.log(`[RateLimiter] Initialized: ${this.maxTokensPerSecond} req/sec, ${this.maxTokensPerMinute} req/min`);
  }

  /**
   * Refill tokens in the bucket based on elapsed time
   */
  refillTokens(bucket, maxTokens) {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(timePassed / bucket.refillInterval);

    if (intervalsElapsed > 0) {
      bucket.tokens = Math.min(
        maxTokens,
        bucket.tokens + intervalsElapsed
      );
      bucket.lastRefill = now;
    }
  }

  /**
   * Check if a request can be made immediately
   */
  canMakeRequest() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute);

    const canMakeSecond = this.secondBucket.tokens > 0;
    const canMakeMinute = this.minuteBucket.tokens > 0;

    return canMakeSecond && canMakeMinute;
  }

  /**
   * Consume tokens from both buckets
   */
  consumeTokens() {
    this.secondBucket.tokens -= 1;
    this.minuteBucket.tokens -= 1;
  }

  /**
   * Get wait time until next request can be made (in milliseconds)
   */
  getWaitTime() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute);

    let waitTime = 0;

    // Calculate wait time for second bucket
    if (this.secondBucket.tokens <= 0) {
      const nextRefill = this.secondBucket.lastRefill + this.secondBucket.refillInterval;
      waitTime = Math.max(waitTime, nextRefill - Date.now());
    }

    // Calculate wait time for minute bucket
    if (this.minuteBucket.tokens <= 0) {
      const nextRefill = this.minuteBucket.lastRefill + this.minuteBucket.refillInterval;
      waitTime = Math.max(waitTime, nextRefill - Date.now());
    }

    return Math.max(0, waitTime);
  }

  /**
   * Acquire permission to make a request
   * Returns a promise that resolves when request can be made
   * Queues requests to maintain order
   */
  async acquire() {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      if (this.canMakeRequest()) {
        // Token available, process immediately
        this.consumeTokens();
        const resolve = this.queue.shift();
        resolve();

        // Small delay before processing next request to avoid burst
        await new Promise(r => setTimeout(r, 10));
      } else {
        // No tokens available, wait
        const waitTime = this.getWaitTime();
        if (waitTime > 0) {
          await new Promise(r => setTimeout(r, Math.min(waitTime + 10, 100)));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get current limiter status (for debugging)
   */
  getStatus() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute);

    return {
      secondBucket: {
        tokensAvailable: this.secondBucket.tokens,
        maxTokens: this.maxTokensPerSecond
      },
      minuteBucket: {
        tokensAvailable: this.minuteBucket.tokens,
        maxTokens: this.maxTokensPerMinute
      },
      queueLength: this.queue.length
    };
  }
}

// Create and export a singleton instance
const globalRateLimiter = new RateLimiter({
  maxTokensPerSecond: 3,
  maxTokensPerMinute: 60
});

module.exports = globalRateLimiter;
