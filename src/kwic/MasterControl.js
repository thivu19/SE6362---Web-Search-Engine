"use strict";

const InputReader = require("./InputReader");
const LineStorage = require("./LineStorage");
const CircularShifter = require("./CircularShifter");
const Alphabetizer = require("./Alphabetizer");
const IndexSearcher = require("./IndexSearcher");
const OutputWriter = require("./OutputWriter");
const SearchCache = require("./SearchCache");

// MasterControl — owns the sequence. It is the only module the web server calls.
// Every line goes through the pipeline one at a time (incremental):
//   InputReader.storeNextLine (→ LineStorage.setLine) → CircularShifter.shiftLine → Alphabetizer.alph

class MasterControl {
    #paths;
    #lineStorage = new LineStorage();
    #input = new InputReader(this.#lineStorage);
    #circularShifter;
    #alphabetizer;
    #searcher;
    #output;
    #cache = new SearchCache();

    // paths: { corpus, savedLines, noiseWords }
    constructor(paths) {
        this.#paths = paths;
        this.#circularShifter = new CircularShifter(this.#lineStorage, this.#input.readNoiseWords(paths.noiseWords));
        this.#alphabetizer = new Alphabetizer(this.#circularShifter);
        this.#searcher = new IndexSearcher(this.#alphabetizer);
        this.#output = new OutputWriter(this.#lineStorage, this.#circularShifter, this.#alphabetizer);
    }

    // PUBLIC — loads the corpus and previously saved user lines, one line at a time
    start() {
        this.#input.openCorpus(this.#paths.corpus);
        this.#indexQueuedLines();
        this.#input.openSavedLines(this.#paths.savedLines);
        this.#indexQueuedLines();
    }

    // PUBLIC — adds lines from the text area, saves them and clears the search cache.
    addLines(text) {
        this.#input.openUserText(text);
        const added = this.#indexQueuedLines().map(l => this.#output.formatLine(l));
        if (added.length) {
            this.#cache.clear();
            this.#output.saveUserLines(this.#paths.savedLines);
        }
        return { added, rejected: this.#input.getRejected(), stats: this.getStats() };
    }

    // PUBLIC — whole-word, case-insensitive search of the sorted index
    search(query) {
        const started = process.hrtime.bigint();
        const words = this.#input.readQuery(query);
        const key = words.join(" ");
        let response = this.#cache.get(key);
        const fromCache = Boolean(response);
        if (!response) {
            response = this.#buildSearchResponse(words);
            if (words.length) this.#cache.set(key, response);
        }
        const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
        return { ...response, query, fromCache, elapsedMs: Math.round(elapsedMs * 1000) / 1000 };
    }

    // PUBLIC — every stored line
    getStoredLines() {
        const lines = [];
        for (let l = 1; l <= this.#lineStorage.getLineCount(); l++) lines.push(this.#output.formatLine(l));
        return lines;
    }

    // PUBLIC — the full sorted index (expanded)
    getSortedIndex() {
        const entries = [];
        for (let i = 1; i <= this.#alphabetizer.getCount(); i++) entries.push(this.#output.formatIndexEntry(i));
        return entries;
    }

    // PUBLIC
    getStats() {
        return {
            lines: this.#lineStorage.getLineCount(),
            shiftsKept: this.#circularShifter.getShiftCount(),
            shiftsEliminated: this.#circularShifter.getEliminatedCount(),
            indexEntries: this.#alphabetizer.getCount(),
            cachedQueries: this.#cache.getSize()
        };
    }

    // The incremental pipeline: each queued line is stored, shifted and merged
    // into the sorted index before the next line is read. Returns the new line numbers.
    #indexQueuedLines() {
        const stored = [];
        while (this.#input.hasNextLine()) {
            const l = this.#input.storeNextLine();
            if (l === 0) continue;                       // duplicate, already reported
            const { first, last } = this.#circularShifter.shiftLine(l);
            this.#alphabetizer.alph(first, last);
            stored.push(l);
        }
        return stored;
    }

    #buildSearchResponse(words) {
        const positions = this.#searcher.search(words);
        const results = positions.map(i => this.#output.formatIndexEntry(i));
        const matchedLines = [...new Set(results.map(r => r.line))].sort((a, b) => a - b);
        const matchedSet = new Set(matchedLines);

        return {
            normalizedQuery: words.join(" "),
            matchMode: "whole words, case-insensitive",
            isNoiseWord: words.length === 1 && this.#circularShifter.isNoiseWord(words[0]),
            stats: this.getStats(),
            lines: matchedLines.map(l => ({ ...this.#output.formatLine(l), shifts: this.#output.formatShiftsOfLine(l) })),
            sortedEntries: this.getSortedIndex().filter(e => matchedSet.has(e.line)),
            results
        };
    }
}

module.exports = MasterControl;
