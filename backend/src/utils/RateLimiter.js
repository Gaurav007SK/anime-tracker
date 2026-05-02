/**
 * RateLimiter - Production-grade token bucket algorithm for API rate limiting
 * 
 * Key features:
 * - Accurate proportional token refill (tokens per millisecond)
 * - Precise timing: no polling/busy waiting, scheduled wakeups only
 * - Concurrent request limiting with queue management
 * - Request timeout safety to prevent stuck requests
 * - Extensible design supporting independent rate limiters per endpoint
 * - Debug mode for production/development logging control
 * - Async-safe with no race conditions
 */

class RateLimiter {
  constructor(options = {}) {
    // Rate limit configuration
    this.maxTokensPerSecond = options.maxTokensPerSecond || 3;
    this.maxTokensPerMinute = options.maxTokensPerMinute || 60;
    this.maxConcurrent = options.maxConcurrent || Infinity;
    this.requestTimeoutMs = options.requestTimeoutMs || 30000;
    this.debug = options.debug || false;

    // Refill rates: tokens per millisecond (accurate proportional refill)
    this.refillRatePerSecond = this.maxTokensPerSecond / 1000;
    this.refillRatePerMinute = this.maxTokensPerMinute / 60000;

    // Token buckets with precise timing
    this.secondBucket = {
      tokens: this.maxTokensPerSecond,
      lastRefill: Date.now()
    };

    this.minuteBucket = {
      tokens: this.maxTokensPerMinute,
      lastRefill: Date.now()
    };

    // Queue and concurrency management
    this.queue = [];
    this.activeRequests = 0;
    this.processing = false;
    this.scheduledWakeup = null;

    this.log(
      `Initialized: ${this.maxTokensPerSecond} req/sec, ${this.maxTokensPerMinute} req/min, ` +
      `maxConcurrent=${this.maxConcurrent}, timeout=${this.requestTimeoutMs}ms`
    );
  }

  /**
   * Debug logging (only when enabled)
   */
  log(message) {
    if (this.debug) {
      console.log(`[RateLimiter] ${message}`);
    }
  }

  /**
   * Refill tokens based on elapsed time (accurate proportional refill)
   * @private
   */
  refillTokens(bucket, maxTokens, refillRate) {
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * refillRate;

    if (tokensToAdd > 0.001) {
      bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    return bucket.tokens;
  }

  /**
   * Try to consume one token from both buckets
   * @private
   * @returns {boolean} true if consumption succeeded, false otherwise
   */
  tryConsumeTokens() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond, this.refillRatePerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute, this.refillRatePerMinute);

    const canMakeSecond = this.secondBucket.tokens >= 1;
    const canMakeMinute = this.minuteBucket.tokens >= 1;

    if (canMakeSecond && canMakeMinute) {
      this.secondBucket.tokens -= 1;
      this.minuteBucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Calculate exact wait time until next token becomes available
   * @private
   * @returns {number} milliseconds to wait
   */
  calculateWaitTime() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond, this.refillRatePerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute, this.refillRatePerMinute);

    let waitTime = 0;

    // Calculate wait time for per-second bucket
    if (this.secondBucket.tokens < 1) {
      const tokensNeeded = 1 - this.secondBucket.tokens;
      const timeForSecond = tokensNeeded / this.refillRatePerSecond;
      waitTime = Math.max(waitTime, timeForSecond);
    }

    // Calculate wait time for per-minute bucket
    if (this.minuteBucket.tokens < 1) {
      const tokensNeeded = 1 - this.minuteBucket.tokens;
      const timeForMinute = tokensNeeded / this.refillRatePerMinute;
      waitTime = Math.max(waitTime, timeForMinute);
    }

    return Math.max(0, Math.ceil(waitTime));
  }

  /**
   * Process queued requests (async-safe, no race conditions)
   * @private
   */
  async processQueue() {
    // Prevent multiple simultaneous processQueue executions
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
        if (this.tryConsumeTokens()) {
          // Token available, process immediately
          const { resolve, reject, timeout } = this.queue.shift();
          this.activeRequests++;

          clearTimeout(timeout);

          this.log(
            `Request approved (active: ${this.activeRequests}/${this.maxConcurrent}, ` +
            `queued: ${this.queue.length})`
          );

          // Resolve asynchronously to allow queue to continue processing
          setImmediate(() => {
            resolve();
            this.activeRequests--;
            // Trigger next processing cycle
            this.processQueue();
          });
        } else {
          // No tokens available, calculate precise wait time
          const waitTime = this.calculateWaitTime();
          if (waitTime > 0) {
            this.log(
              `Rate limit hit: waiting ${waitTime}ms (queue: ${this.queue.length}, ` +
              `active: ${this.activeRequests}/${this.maxConcurrent})`
            );

            // Cancel any existing scheduled wakeup
            if (this.scheduledWakeup) {
              clearTimeout(this.scheduledWakeup);
            }

            // Schedule precise wakeup at next token refill
            this.scheduledWakeup = setTimeout(() => {
              this.scheduledWakeup = null;
              this.processQueue();
            }, waitTime);

            // Exit loop, wait for scheduled wakeup
            break;
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Acquire permission to make a request
   * @public
   * @returns {Promise<void>} Resolves when request can proceed, rejects on timeout
   */
  async acquire() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Remove from queue if still there
        const index = this.queue.findIndex(item => item.reject === reject);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        this.log(`Request timeout after ${this.requestTimeoutMs}ms`);
        reject(new Error(`Rate limiter request timeout after ${this.requestTimeoutMs}ms`));
      }, this.requestTimeoutMs);

      this.queue.push({ resolve, reject, timeout });
      this.log(`Request queued (queue size: ${this.queue.length})`);

      this.processQueue();
    });
  }

  /**
   * Get current limiter status
   * @public
   * @returns {object} Status object with token info and queue state
   */
  getStatus() {
    this.refillTokens(this.secondBucket, this.maxTokensPerSecond, this.refillRatePerSecond);
    this.refillTokens(this.minuteBucket, this.maxTokensPerMinute, this.refillRatePerMinute);

    return {
      secondBucket: {
        tokensAvailable: Math.floor(this.secondBucket.tokens * 100) / 100,
        maxTokens: this.maxTokensPerSecond,
        refillRatePerMs: this.refillRatePerSecond
      },
      minuteBucket: {
        tokensAvailable: Math.floor(this.minuteBucket.tokens * 100) / 100,
        maxTokens: this.maxTokensPerMinute,
        refillRatePerMs: this.refillRatePerMinute
      },
      queue: {
        length: this.queue.length,
        activeRequests: this.activeRequests,
        maxConcurrent: this.maxConcurrent
      },
      nextWakeupIn: this.calculateWaitTime()
    };
  }

  /**
   * Reset limiter state (useful for testing)
   * @public
   */
  reset() {
    this.secondBucket.tokens = this.maxTokensPerSecond;
    this.secondBucket.lastRefill = Date.now();
    this.minuteBucket.tokens = this.maxTokensPerMinute;
    this.minuteBucket.lastRefill = Date.now();
    this.queue = [];
    this.activeRequests = 0;

    if (this.scheduledWakeup) {
      clearTimeout(this.scheduledWakeup);
      this.scheduledWakeup = null;
    }

    this.log('Rate limiter reset');
  }

  /**
   * Factory method: create an independent rate limiter instance
   * @public
   * @static
   * @param {object} options - Configuration options
   * @returns {RateLimiter} New rate limiter instance
   */
  static create(options = {}) {
    return new RateLimiter(options);
  }
}

// Export singleton for backward compatibility
const globalRateLimiter = new RateLimiter({
  maxTokensPerSecond: 3,
  maxTokensPerMinute: 60,
  debug: process.env.DEBUG_RATE_LIMITER === 'true'
});

module.exports = globalRateLimiter;

// Also export the class for creating independent instances
module.exports.RateLimiter = RateLimiter;
