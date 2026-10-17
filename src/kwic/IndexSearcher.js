"use strict";

// IndexSearcher — hides how a query is matched against the sorted index.
// Matching is whole-word and case-insensitive: the query's words must equal the
// first words of a shift. "index" matches "index ..." but not "indexing ...".
// Because the index is sorted, matches are one contiguous run found by binary search.

class IndexSearcher {
    #alphabetizer;

    constructor(alphabetizer) {
        this.#alphabetizer = alphabetizer;
    }

    // PUBLIC — sorted positions i whose shift starts with queryWords (lowercase)
    search(queryWords) {
        const positions = [];
        if (!queryWords.length) return positions;
        for (let i = this.#firstNotBefore(queryWords); i <= this.#alphabetizer.getCount(); i++) {
            if (this.#compareToQuery(i, queryWords) !== 0) break;
            positions.push(i);
        }
        return positions;
    }

    // Binary search: first position whose shift does not sort before the query.
    #firstNotBefore(queryWords) {
        let low = 1, high = this.#alphabetizer.getCount() + 1;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.#compareToQuery(mid, queryWords) < 0) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    // <0: shift sorts before the query; 0: shift starts with the query; >0: after.
    #compareToQuery(i, queryWords) {
        const alpha = this.#alphabetizer;
        const n = alpha.getWordCount(i);
        for (let w = 1; w <= queryWords.length; w++) {
            if (w > n) return -1;
            const word = alpha.getWord(i, w).toLowerCase();
            if (word < queryWords[w - 1]) return -1;
            if (word > queryWords[w - 1]) return 1;
        }
        return 0;
    }
}

module.exports = IndexSearcher;
