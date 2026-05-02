// Request throttling utility to prevent rate limiting
class RequestThrottler {
  constructor(maxRequests = 5, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
    this.retryQueue = [];
  }

  async execute(fn) {
    // Clean old requests
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // Wait if we're at max requests
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.execute(fn);
    }

    this.requests.push(Date.now());

    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait and retry
        console.log('[Throttler] Rate limited, retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.execute(fn);
      }
      throw error;
    }
  }
}

export const throttler = new RequestThrottler(3, 1000); // 3 requests per second max
