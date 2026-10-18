"use strict";

// LineStorage — hides how lines and words are stored.
// Lines and words are numbered from 1 (course convention).

class LineStorage {
    #lines = [];        // { words: string[], url }

    // PUBLIC — stores one line and returns its line number
    setLine(words, url) {
        const l = this.#lines.length + 1;
        this.#lines.push({ words: [], url: url || null });
        words.forEach((word, i) => this.#setWord(l, i + 1, word));
        return l;
    }

    // PUBLIC
    getLineCount() {
        return this.#lines.length;
    }

    // PUBLIC — number of words in line l
    getWordCount(l) {
        return this.#lines[l - 1] ? this.#lines[l - 1].words.length : 0;
    }

    // PUBLIC — word w of line l
    getWord(l, w) {
        return this.#lines[l - 1] ? this.#lines[l - 1].words[w - 1] : undefined;
    }

    // PUBLIC — URL of line l (or null)
    getUrl(l) {
        return this.#lines[l - 1] ? this.#lines[l - 1].url : null;
    }

    // PUBLIC — true if the same words (ignoring case) are already stored
    hasLine(words) {
        const key = words.join(" ").toLowerCase();
        return this.#lines.some(line => line.words.join(" ").toLowerCase() === key);
    }

    #setWord(l, w, word) {
        this.#lines[l - 1].words[w - 1] = word;
    }
}

module.exports = LineStorage;
