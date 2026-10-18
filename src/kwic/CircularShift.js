"use strict";

// CircularShift — hides how circular shifts are stored and which are noise.
// A shift is kept as (line, offset); its words are read from LineStorage.
// Shifts that start with a noise word are dropped here (noise elimination
// at the end of circular shift).

class CircularShift {
    #lineStorage;
    #noiseWords;
    #shifts = [];       // { line, offset }
    #noiseCount = 0;

    constructor(lineStorage, noiseWords) {
        this.#lineStorage = lineStorage;
        this.#noiseWords = new Set(noiseWords);
    }

    // PUBLIC — makes the shifts of line l; returns the new shift numbers { first, last }
    setShifts(l) {
        const first = this.#shifts.length + 1;
        for (let offset = 1; offset <= this.#lineStorage.getWordCount(l); offset++) {
            if (this.#isNoise(this.#lineStorage.getWord(l, offset))) this.#noiseCount++;
            else this.#setShift(this.#shifts.length + 1, l, offset);
        }
        return { first, last: this.#shifts.length };
    }

    // PUBLIC
    getShiftCount() {
        return this.#shifts.length;
    }

    // PUBLIC — number of shifts dropped because they start with a noise word
    getNoiseCount() {
        return this.#noiseCount;
    }

    // PUBLIC — number of words in shift s
    getWordCount(s) {
        return this.#shifts[s - 1] ? this.#lineStorage.getWordCount(this.#shifts[s - 1].line) : 0;
    }

    // PUBLIC — word w of shift s (wraps around the end of the line)
    getWord(s, w) {
        const shift = this.#shifts[s - 1];
        if (!shift) return undefined;
        const n = this.#lineStorage.getWordCount(shift.line);
        return this.#lineStorage.getWord(shift.line, ((shift.offset - 1 + w - 1) % n) + 1);
    }

    // PUBLIC — line number shift s came from
    getLineOf(s) {
        return this.#shifts[s - 1] ? this.#shifts[s - 1].line : 0;
    }

    #setShift(s, line, offset) {
        this.#shifts[s - 1] = { line, offset };
    }

    #isNoise(word) {
        return this.#noiseWords.has(String(word).toLowerCase());
    }
}

module.exports = CircularShift;
