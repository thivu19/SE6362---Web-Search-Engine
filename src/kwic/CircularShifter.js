"use strict";

// CircularShifter — hides how circular shifts are represented and which shifts
// are eliminated as noise. A shift is stored as (line, offset), not as a copy
// of the words; its words are read back through LineStorage.
// Shifts and words are numbered from 1.

class CircularShifter {
    #lineStorage;
    #noiseWords;
    #shifts = [];           // kept shifts: { line, offset }
    #eliminated = [];       // noise-led shifts: { line, offset }

    constructor(lineStorage, noiseWords) {
        this.#lineStorage = lineStorage;
        this.#noiseWords = new Set(noiseWords);
    }

    // PUBLIC — incremental step: generates every circular shift of line l, then
    // eliminates shifts that start with a noise word (noise elimination sits at
    // the end of circular shift). Returns the range of new kept shift numbers.
    shiftLine(l) {
        const n = this.#lineStorage.getWordCount(l);
        const first = this.#shifts.length + 1;
        let eliminated = 0;
        for (let offset = 1; offset <= n; offset++) {
            if (this.isNoiseWord(this.#lineStorage.getWord(l, offset))) {
                this.#eliminated.push({ line: l, offset });
                eliminated++;
            } else {
                this.#setShift(this.#shifts.length + 1, l, offset);
            }
        }
        return { first, last: this.#shifts.length, eliminated };
    }

    // PUBLIC — number of kept shifts
    getShiftCount() {
        return this.#shifts.length;
    }

    // PUBLIC — number of words in shift s (same as its line)
    getWordCount(s) {
        const shift = this.#shifts[s - 1];
        return shift ? this.#lineStorage.getWordCount(shift.line) : 0;
    }

    // PUBLIC — word w of shift s
    getWord(s, w) {
        const shift = this.#shifts[s - 1];
        return shift ? this.#rotatedWord(shift, w) : undefined;
    }

    // PUBLIC — the line shift s came from
    getLineOf(s) {
        const shift = this.#shifts[s - 1];
        return shift ? shift.line : 0;
    }

    // PUBLIC — kept shift numbers that came from line l
    getShiftsOfLine(l) {
        const result = [];
        this.#shifts.forEach((shift, i) => { if (shift.line === l) result.push(i + 1); });
        return result;
    }

    // PUBLIC — eliminated (noise-led) shifts of line l, as word arrays
    getEliminatedShiftsOfLine(l) {
        return this.#eliminated
            .filter(shift => shift.line === l)
            .map(shift => {
                const words = [];
                const n = this.#lineStorage.getWordCount(l);
                for (let w = 1; w <= n; w++) words.push(this.#rotatedWord(shift, w));
                return words;
            });
    }

    // PUBLIC — total number of eliminated shifts
    getEliminatedCount() {
        return this.#eliminated.length;
    }

    // PUBLIC — true if word is on the noise-word list (case-insensitive)
    isNoiseWord(word) {
        return this.#noiseWords.has(String(word).toLowerCase());
    }

    #setShift(s, line, offset) {
        this.#shifts[s - 1] = { line, offset };
    }

    // Word w of a shift starting at `offset`: wraps around the end of the line.
    #rotatedWord(shift, w) {
        const n = this.#lineStorage.getWordCount(shift.line);
        return this.#lineStorage.getWord(shift.line, ((shift.offset - 1 + w - 1) % n) + 1);
    }
}

module.exports = CircularShifter;
