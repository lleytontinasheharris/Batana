// ussd/src/config/redis.js
// Redis connection for USSD session state
// Uses ioredis — works with Upstash Redis

const Redis = require('ioredis');

let client = null;
let usingFallback = false;

// In-memory fallback for local development without Redis
const memoryStore = new Map();

function getMemoryClient() {
    return {
        get: async (key) => memoryStore.get(key) || null,
        set: async (key, value, ...args) => {
            memoryStore.set(key, value);
            // Handle EX TTL argument
            const exIdx = args.indexOf('EX');
            if (exIdx !== -1) {
                const ttl = args[exIdx + 1];
                setTimeout(() => memoryStore.delete(key), ttl * 1000);
            }
            return 'OK';
        },
        del: async (key) => {
            memoryStore.delete(key);
            return 1;
        },
        ping: async () => 'PONG'
    };
}

function getRedisClient() {
    if (client) return client;

    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl || redisUrl.includes('your_password')) {
        console.warn('[Redis] No REDIS_URL set — using in-memory session store');
        console.warn('[Redis] Sessions will be lost on restart. Set REDIS_URL for production.');
        usingFallback = true;
        client = getMemoryClient();
        return client;
    }

    try {
        client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 5000,
        });

        client.on('connect', () => {
            console.log('[Redis] Connected to Upstash Redis');
        });

        client.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
            if (!usingFallback) {
                console.warn('[Redis] Falling back to in-memory store');
                usingFallback = true;
                client = getMemoryClient();
            }
        });

        return client;
    } catch (err) {
        console.warn('[Redis] Failed to connect, using in-memory fallback');
        usingFallback = true;
        client = getMemoryClient();
        return client;
    }
}

module.exports = { getRedisClient };