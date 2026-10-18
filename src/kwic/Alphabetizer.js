"use strict";

// Alphabetizer — hides the sort order and how the sorted index is kept.
// Incremental: alph() sorts only the new shifts and merges them into the index.
// Order: word by word, ignoring case; shorter first when one is a prefix of the
// other; ties by line number, then shift number.
// getMatches() also lives here because it relies on that sort order (binary search).

class Alphabetizer {
    #circularShift;
    #order = [];        // shift numbers in sorted order

    constructor(circularShift) {
        this.#circularShift = circularShift;
    }

    // PUBLIC — merges shifts first..last into the sorted index
    alph(first, last) {
        const added = [];
        for (let s = first; s <= last; s++) added.push(s);
        added.sort((a, b) => this.#compare(a, b));
        this.#order = this.#merge(this.#order, added);
    }

    // PUBLIC — number of entries in the sorted index
    getCount() {
        return this.#order.length;
    }

    // PUBLIC — number of words in the i-th sorted shift
    getWordCount(i) {
        return this.#circularShift.getWordCount(this.#ith(i));
    }

    // PUBLIC — word w of the i-th sorted shift
    getWord(i, w) {
        return this.#circularShift.getWord(this.#ith(i), w);
    }

    // PUBLIC — line number of the i-th sorted shift
    getLineOf(i) {
        return this.#circularShift.getLineOf(this.#ith(i));
    }

    // PUBLIC — sorted positions whose shift starts with these words (whole words,
    // lowercase). "index" matches "index ..." but not "indexing ...".
    getMatches(words) {
        const matches = [];
        if (!words.length) return matches;
        let low = 1, high = this.getCount() + 1;        // binary search for the first match
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.#compareToQuery(mid, words) < 0) low = mid + 1;
            else high = mid;
        }
        for (let i = low; i <= this.getCount() && this.#compareToQuery(i, words) === 0; i++) matches.push(i);
        return matches;
    }

    #ith(i) {
        return this.#order[i - 1];
    }

    #merge(left, right) {
        const merged = [];
        let a = 0, b = 0;
        while (a < left.length && b < right.length) {
            merged.push(this.#compare(left[a], right[b]) <= 0 ? left[a++] : right[b++]);
        }
        return merged.concat(left.slice(a), right.slice(b));
    }

    #compare(s1, s2) {
        const cs = this.#circularShift;
        const n1 = cs.getWordCount(s1), n2 = cs.getWordCount(s2);
        for (let w = 1; w <= Math.min(n1, n2); w++) {
            const w1 = cs.getWord(s1, w).toLowerCase(), w2 = cs.getWord(s2, w).toLowerCase();
            if (w1 !== w2) return w1 < w2 ? -1 : 1;
        }
        return (n1 - n2) || (cs.getLineOf(s1) - cs.getLineOf(s2)) || (s1 - s2);
    }

    // < 0: entry i sorts before the query; 0: entry i starts with the query; > 0: after
    #compareToQuery(i, words) {
        for (let w = 1; w <= words.length; w++) {
            if (w > this.getWordCount(i)) return -1;
            const word = this.getWord(i, w).toLowerCase();
            if (word !== words[w - 1]) return word < words[w - 1] ? -1 : 1;
        }
        return 0;
    }
}

module.exports = Alphabetizer;
