"use strict";

const fs = require("fs");

// Input — hides where lines come from and how text is turned into words.
// Lines are read into a private queue; getNextLine() stores them in LineStorage
// one at a time, which is what makes the pipeline incremental.

const MAX_WORDS = 60;
const MAX_LINES = 100;
const URL_PATTERN = /^https?:\/\/\S+$/i;

class Input {
    #lineStorage;
    #queue = [];        // { words, url }
    #rejected = [];     // { text, reason }

    constructor(lineStorage) {
        this.#lineStorage = lineStorage;
    }

    // PUBLIC — queues the lines of a JSON file [{ text, url }]; a missing file adds nothing
    readFile(path) {
        this.#rejected = [];
        if (!fs.existsSync(path)) return;
        for (const e of JSON.parse(fs.readFileSync(path, "utf8"))) this.#addEntry(e.text, e.url);
    }

    // PUBLIC — queues lines typed in the text area (newline or "$" separated,
    // optional URL at the end of a line). Blank lines are skipped.
    readText(text) {
        this.#rejected = [];
        const rows = String(text || "").split(/\r?\n|\$/).filter(r => r.trim());
        rows.forEach((row, k) => {
            if (k >= MAX_LINES) return this.#rejected.push({ text: row.trim(), reason: `more than ${MAX_LINES} lines` });
            const tokens = row.trim().split(/\s+/);
            const url = URL_PATTERN.test(tokens[tokens.length - 1]) ? tokens.pop() : null;
            this.#addEntry(tokens.join(" "), url, row.trim());
        });
    }

    // PUBLIC — stores the next queued line in LineStorage and returns its line number,
    // or 0 when no lines are left. Duplicates are skipped and reported in getRejected().
    getNextLine() {
        while (this.#queue.length) {
            const { words, url } = this.#queue.shift();
            if (!this.#lineStorage.hasLine(words)) return this.#lineStorage.setLine(words, url);
            this.#rejected.push({ text: words.join(" "), reason: "duplicate of a stored line" });
        }
        return 0;
    }

    // PUBLIC — lines rejected by the last readFile/readText
    getRejected() {
        return this.#rejected.slice();
    }

    // PUBLIC — a query cleaned with the same rules as a line, in lowercase
    getQueryWords(query) {
        return this.#toWords(query).map(w => w.toLowerCase());
    }

    // PUBLIC — the noise-word list (JSON array of strings)
    getNoiseWords(path) {
        return JSON.parse(fs.readFileSync(path, "utf8")).map(w => String(w).toLowerCase());
    }

    #addEntry(text, url, original) {
        const words = this.#toWords(text);
        if (!words.length) this.#rejected.push({ text: original || text, reason: "no words (punctuation or URL only)" });
        else if (words.length > MAX_WORDS) this.#rejected.push({ text: original || text, reason: `more than ${MAX_WORDS} words` });
        else this.#queue.push({ words, url: url || null });
    }

    // Splits on spaces and strips punctuation from the start and end of each word
    // (inner ' and - are kept: "don't", "high-level").
    #toWords(text) {
        return String(text || "")
            .split(/\s+/)
            .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
            .filter(Boolean);
    }
}

module.exports = Input;
