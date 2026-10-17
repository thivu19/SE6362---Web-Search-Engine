"use strict";

// SearchCache — hides how previous query results are kept.
// Server-side, keyed by the normalized query; cleared whenever lines change.

const MAX_ENTRIES = 200;

class SearchCache {
    #entries = new Map();

    // PUBLIC
    get(key) {
        return this.#entries.has(key) ? this.#entries.get(key) : null;
    }

    // PUBLIC — oldest entry is dropped once the cache is full
    set(key, value) {
        if (this.#entries.size >= MAX_ENTRIES) this.#entries.delete(this.#entries.keys().next().value);
        this.#entries.set(key, value);
    }

    // PUBLIC
    clear() {
        this.#entries.clear();
    }

    // PUBLIC
    getSize() {
        return this.#entries.size;
    }
}

module.exports = SearchCache;
