// ─── Simple In-Memory Cache with TTL ───────────────────────────
// Good enough for a personal tool. Survives as long as the server runs.

class MemoryCache {
    constructor() {
        this.store = new Map();
        // Periodic cleanup every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }

    set(key, value, ttlMs = 30 * 60 * 1000) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    delete(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }

    get size() {
        return this.store.size;
    }
}

export const cache = new MemoryCache();
