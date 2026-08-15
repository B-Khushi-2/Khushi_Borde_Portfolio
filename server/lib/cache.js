const logger = require("./logger");

class MemoryCache {
  constructor(defaultTtlSeconds = 300) {
    this.cache = new Map();
    this.defaultTtl = defaultTtlSeconds * 1000;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      logger.debug({ key }, "Cache entry expired");
      return null;
    }

    logger.debug({ key }, "Cache hit");
    return entry.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
    logger.debug({ key, ttlSeconds }, "Cache set entry");
  }

  clear() {
    this.cache.clear();
    logger.debug("Cache cleared");
  }
}

// Singleton global cache instances
const retrievalCache = new MemoryCache(600); // 10 minutes cache for embedding/vector retrieval
const responseCache = new MemoryCache(300);  // 5 minutes cache for LLM assistant responses

module.exports = {
  retrievalCache,
  responseCache
};
