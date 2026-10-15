'use strict';

/**
 * Lightweight, zero-dependency in-memory LRU + TTL cache for public read queries.
 * Safe for free-tier Render instances with strict 512MB RAM constraints.
 */
class MemoryCache {
  constructor(maxEntries = 500, defaultTtlSeconds = 60) {
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.store = new Map();
  }

  /**
   * Deterministically stringify query parameters into a uniform cache key.
   * @param {string} prefix
   * @param {object|string} query
   * @returns {string}
   */
  static makeKey(prefix, query = {}) {
    if (typeof query === 'string') return `${prefix}:${query}`;
    if (!query || typeof query !== 'object') return prefix;

    const keys = Object.keys(query).sort();
    const parts = [];
    for (const k of keys) {
      const v = query[k];
      if (v !== undefined && v !== null && v !== '') {
        parts.push(`${k}=${encodeURIComponent(String(v))}`);
      }
    }
    return parts.length > 0 ? `${prefix}:${parts.join('&')}` : prefix;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    entry.accessedAt = now;
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    const now = Date.now();
    const ttlMs = (ttlSeconds !== undefined ? ttlSeconds : this.defaultTtlMs / 1000) * 1000;

    // Enforce max capacity: evict oldest accessed entry
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.store.entries()) {
        if (v.accessedAt < oldestTime) {
          oldestTime = v.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: now + ttlMs,
      accessedAt: now
    });
  }

  del(key) {
    this.store.delete(key);
  }

  delByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }

  size() {
    // Purge expired and return count
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now > v.expiresAt) this.store.delete(k);
    }
    return this.store.size;
  }
}

const memoryCache = new MemoryCache(500, 45);

module.exports = { MemoryCache, memoryCache };
