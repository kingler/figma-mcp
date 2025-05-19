const { LRUCache } = require('lru-cache');

// Get environment variables with defaults
const TTL = parseInt(process.env.CACHE_TTL || '300000'); // 5 minutes in ms
const MAX_ITEMS = parseInt(process.env.CACHE_MAX_ITEMS || '500');

// Create LRU cache
const cache = new LRUCache({
  max: MAX_ITEMS,
  ttl: TTL,
  allowStale: false,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or undefined
 */
const get = async (key) => {
  return cache.get(key);
};

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} [ttl] - Optional TTL override
 * @returns {Promise<boolean>} Success
 */
const set = async (key, value, ttl) => {
  const options = ttl ? { ttl } : undefined;
  cache.set(key, value, options);
  return true;
};

/**
 * Delete item from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success
 */
const del = async (key) => {
  return cache.delete(key);
};

/**
 * Clear the entire cache
 * @returns {Promise<void>}
 */
const clear = async () => {
  cache.clear();
};

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
const getStats = () => {
  return {
    size: cache.size,
    maxSize: MAX_ITEMS,
    ttl: TTL,
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  getStats,
}; 