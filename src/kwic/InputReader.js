"use strict";

const fs = require("fs");

// InputReader — hides how raw text becomes lines of words and gets into LineStorage.
// Design decisions hidden: input formats (corpus file, saved lines, text area, query)
// and the normalization rules (punctuation, empty and duplicate lines, separators, URLs).
//
// Lines are read into a private queue by an open...() call; Master Control then pulls
// them one at a time with storeNextLine(), which is what makes the pipeline incremental.

const MAX_WORDS_PER_LINE = 60;
const MAX_LINES_PER_SUBMIT = 100;
const URL_PATTERN = /^https?:\/\/\S+$/i;

class InputReader {
    #lineStorage;
    #queue = [];            // pending { words, url, source }
    #rejected = [];         // { text, reason } since the last open...()

    constructor(lineStorage) {
        this.#lineStorage = lineStorage;
    }

    // PUBLIC — queues the seed corpus: a JSON array of { text, url }
    openCorpus(path) {
        this.#open(JSON.parse(fs.readFileSync(path, "utf8")), "corpus");
    }

    // PUBLIC — queues previously saved user lines; a missing file means none yet
    openSavedLines(path) {
        this.#open(fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : [], "user");
    }

    // PUBLIC — queues text from the text area. Lines are separated by newlines or "$";
    // a trailing http(s) URL becomes the line's URL. Blank lines are skipped silently.
    openUserText(text) {
        const entries = [];
        this.#rejected = [];
        for (const raw of String(text || "").split(/\r?\n|\$/)) {
            if (!raw.trim()) continue;
            if (entries.length >= MAX_LINES_PER_SUBMIT) {
                this.#rejected.push({ text: raw.trim(), reason: `more than ${MAX_LINES_PER_SUBMIT} lines in one submission` });
                continue;
            }
            const tokens = raw.trim().split(/\s+/);
            const url = URL_PATTERN.test(tokens[tokens.length - 1]) ? tokens.pop() : null;
            entries.push({ text: tokens.join(" "), url, raw: raw.trim() });
        }
        this.#open(entries, "user", true);
    }

    // PUBLIC — true while queued lines remain
    hasNextLine() {
        return this.#queue.length > 0;
    }

    // PUBLIC — stores the next queued line in LineStorage and returns its line number,
    // or 0 if the line duplicates a stored line (it is then added to the rejected list).
    storeNextLine() {
        const record = this.#queue.shift();
        if (!record) return 0;
        if (this.#lineStorage.containsLine(record.words)) {
            this.#rejected.push({ text: record.words.join(" "), reason: "duplicate of a stored line" });
            return 0;
        }
        return this.#lineStorage.setLine(record.words, record.url, record.source);
    }

    // PUBLIC — lines rejected since the last open...() call
    getRejected() {
        return this.#rejected.slice();
    }

    // PUBLIC — a query is normalized with the same rules as a line, then lowercased
    readQuery(query) {
        return this.#toWords(query).map(w => w.toLowerCase());
    }

    // PUBLIC — reads the configurable noise-word list
    readNoiseWords(path) {
        return JSON.parse(fs.readFileSync(path, "utf8")).map(w => String(w).toLowerCase());
    }

    #open(entries, source, keepRejected) {
        if (!keepRejected) this.#rejected = [];
        for (const e of entries) {
            const words = this.#toWords(e.text);
            if (words.length === 0) {
                this.#rejected.push({ text: e.raw || e.text, reason: "no words (punctuation or URL only)" });
            } else if (words.length > MAX_WORDS_PER_LINE) {
                this.#rejected.push({ text: e.raw || e.text, reason: `more than ${MAX_WORDS_PER_LINE} words` });
            } else {
                this.#queue.push({ words, url: e.url || null, source });
            }
        }
    }

    // Words are whitespace-separated. Leading/trailing punctuation is stripped;
    // inner apostrophes and hyphens are kept ("don't", "high-level").
    #toWords(text) {
        return String(text || "")
            .split(/\s+/)
            .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
            .filter(Boolean);
    }
}

module.exports = InputReader;
