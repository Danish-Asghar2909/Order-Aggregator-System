// File: src/utils/deduplication.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

async function isDuplicate(productId, vendor) {
  const key = `product:${vendor}:${productId}`;
  const exists = await redis.exists(key);
  if (!exists) {
    await redis.set(key, '1', 'EX', 3600);
    return false;
  }
  return true;
}

module.exports = { isDuplicate };
