"use strict";

const Input = require("./Input");
const LineStorage = require("./LineStorage");
const CircularShift = require("./CircularShift");
const Alphabetizer = require("./Alphabetizer");
const Output = require("./Output");

// MasterControl — owns the order of calls. The web server only calls this module.
// Incremental: each line is stored, shifted and merged into the index before the next.

class MasterControl {
    #paths;             // { corpus, savedLines, noiseWords }
    #input;
    #circularShift;
    #alphabetizer;
    #output;
    #firstUserLine = 1; // lines from here on were added by users and get saved

    constructor(paths) {
        this.#paths = paths;
        const lineStorage = new LineStorage();
        this.#input = new Input(lineStorage);
        this.#circularShift = new CircularShift(lineStorage, this.#input.getNoiseWords(paths.noiseWords));
        this.#alphabetizer = new Alphabetizer(this.#circularShift);
        this.#output = new Output(lineStorage, this.#circularShift, this.#alphabetizer);
    }

    // PUBLIC — indexes the corpus, then the lines users saved earlier
    start() {
        this.#input.readFile(this.#paths.corpus);
        this.#indexLines();
        this.#firstUserLine = this.#output.getStats().lines + 1;
        this.#input.readFile(this.#paths.savedLines);
        this.#indexLines();
    }

    // PUBLIC — indexes lines from the text area and saves them
    addLines(text) {
        this.#input.readText(text);
        const added = this.#indexLines();
        if (added.length) this.#output.saveLines(this.#paths.savedLines, this.#firstUserLine);
        return {
            added: added.map(l => this.#output.getLine(l)),
            rejected: this.#input.getRejected(),
            stats: this.#output.getStats()
        };
    }

    // PUBLIC — results for a query, plus the steps for the lines that matched
    search(query) {
        const started = process.hrtime.bigint();
        const positions = this.#alphabetizer.getMatches(this.#input.getQueryWords(query));
        const results = positions.map(i => this.#output.getEntry(i));
        const lineNumbers = [...new Set(results.map(r => r.line))].sort((a, b) => a - b);
        const matched = new Set(lineNumbers);
        return {
            query,
            results,
            lines: lineNumbers.map(l => ({ ...this.#output.getLine(l), shifts: this.#output.getShifts(l) })),
            sortedEntries: this.#output.getIndex().filter(e => matched.has(e.line)),
            stats: this.#output.getStats(),
            elapsedMs: Number(process.hrtime.bigint() - started) / 1e6
        };
    }

    // PUBLIC — all stored lines and the full sorted index
    getIndex() {
        return { lines: this.#output.getLines(), entries: this.#output.getIndex(), stats: this.#output.getStats() };
    }

    // The incremental loop: store one line, shift it, merge its shifts; repeat.
    #indexLines() {
        const added = [];
        let l;
        while ((l = this.#input.getNextLine()) > 0) {
            const { first, last } = this.#circularShift.setShifts(l);
            this.#alphabetizer.alph(first, last);
            added.push(l);
        }
        return added;
    }
}

module.exports = MasterControl;
