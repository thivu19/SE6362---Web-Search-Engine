"use strict";

// LineStorage — hides how lines and words are stored.
// Lines and words are numbered from 1 (course convention).

class LineStorage {
    #lines = [];          // each: { words: string[], url, source }

    // PUBLIC — appends a line and returns its line number l
    setLine(words, url, source) {
        const l = this.#lines.length + 1;
        this.#lines.push({ words: [], url: url || null, source: source || "user" });
        words.forEach((word, i) => this.#setWord(l, i + 1, word));
        return l;
    }

    // PUBLIC — number of stored lines
    getLineCount() {
        return this.#lines.length;
    }

    // PUBLIC — number of words in line l (0 if l does not exist)
    getWordCount(l) {
        const line = this.#lines[l - 1];
        return line ? line.words.length : 0;
    }

    // PUBLIC — word w of line l (undefined if out of range)
    getWord(l, w) {
        const line = this.#lines[l - 1];
        return line ? line.words[w - 1] : undefined;
    }

    // PUBLIC — URL associated with line l
    getUrl(l) {
        const line = this.#lines[l - 1];
        return line ? line.url : null;
    }

    // PUBLIC — "corpus" or "user"
    getSource(l) {
        const line = this.#lines[l - 1];
        return line ? line.source : null;
    }

    // PUBLIC — true if a line with the same words (ignoring case) is already stored
    containsLine(words) {
        const key = words.join(" ").toLowerCase();
        return this.#lines.some(line => line.words.join(" ").toLowerCase() === key);
    }

    #setWord(l, w, word) {
        this.#lines[l - 1].words[w - 1] = word;
    }
}

module.exports = LineStorage;
