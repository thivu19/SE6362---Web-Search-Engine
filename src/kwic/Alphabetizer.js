"use strict";

// Alphabetizer — hides the sorting algorithm and the sorted representation.
// Incremental: alph() sorts only the newly added shifts and merges them into
// the existing sorted index, so the index is never rebuilt from scratch.
//
// Order: word by word, case-insensitive, by character code; a shift that is a
// prefix of another comes first. Ties (identical words) are broken by line
// number, then by shift number, so the order is always deterministic.

class Alphabetizer {
    #circularShifter;
    #order = [];            // shift numbers in sorted order; position i is #order[i - 1]

    constructor(circularShifter) {
        this.#circularShifter = circularShifter;
    }

    // PUBLIC — merges shifts first..last into the sorted index
    alph(first, last) {
        if (last < first) return;
        const added = [];
        for (let s = first; s <= last; s++) added.push(s);
        added.sort((a, b) => this.#compareShifts(a, b));
        this.#order = this.#merge(this.#order, added);
    }

    // PUBLIC — number of entries in the sorted index
    getCount() {
        return this.#order.length;
    }

    // PUBLIC — shift number at sorted position i (1-based)
    ith(i) {
        return this.#order[i - 1];
    }

    // PUBLIC — number of words in the i-th sorted shift
    getWordCount(i) {
        return this.#circularShifter.getWordCount(this.ith(i));
    }

    // PUBLIC — word w of the i-th sorted shift
    getWord(i, w) {
        return this.#circularShifter.getWord(this.ith(i), w);
    }

    // PUBLIC — line number the i-th sorted shift came from
    getLineOf(i) {
        return this.#circularShifter.getLineOf(this.ith(i));
    }

    #merge(left, right) {
        const merged = [];
        let a = 0, b = 0;
        while (a < left.length && b < right.length) {
            if (this.#compareShifts(left[a], right[b]) <= 0) merged.push(left[a++]);
            else merged.push(right[b++]);
        }
        while (a < left.length) merged.push(left[a++]);
        while (b < right.length) merged.push(right[b++]);
        return merged;
    }

    #compareShifts(s1, s2) {
        const cs = this.#circularShifter;
        const n1 = cs.getWordCount(s1);
        const n2 = cs.getWordCount(s2);
        for (let w = 1; w <= Math.min(n1, n2); w++) {
            const w1 = cs.getWord(s1, w).toLowerCase();
            const w2 = cs.getWord(s2, w).toLowerCase();
            if (w1 < w2) return -1;
            if (w1 > w2) return 1;
        }
        if (n1 !== n2) return n1 - n2;
        return (cs.getLineOf(s1) - cs.getLineOf(s2)) || (s1 - s2);
    }
}

module.exports = Alphabetizer;
