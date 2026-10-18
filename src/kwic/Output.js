"use strict";

const fs = require("fs");

// Output — hides the output format: what the web page receives, and how
// added lines are saved to the output file.

class Output {
    #lineStorage;
    #circularShift;
    #alphabetizer;

    constructor(lineStorage, circularShift, alphabetizer) {
        this.#lineStorage = lineStorage;
        this.#circularShift = circularShift;
        this.#alphabetizer = alphabetizer;
    }

    // PUBLIC — line l: { line, text, words, url }
    getLine(l) {
        const ls = this.#lineStorage;
        const words = [];
        for (let w = 1; w <= ls.getWordCount(l); w++) words.push(ls.getWord(l, w));
        return { line: l, text: words.join(" "), words, url: ls.getUrl(l) };
    }

    // PUBLIC — every stored line
    getLines() {
        const lines = [];
        for (let l = 1; l <= this.#lineStorage.getLineCount(); l++) lines.push(this.getLine(l));
        return lines;
    }

    // PUBLIC — the circular shifts made from line l: [{ shift, text }]
    getShifts(l) {
        const cs = this.#circularShift;
        const shifts = [];
        for (let s = 1; s <= cs.getShiftCount(); s++) {
            if (cs.getLineOf(s) !== l) continue;
            const words = [];
            for (let w = 1; w <= cs.getWordCount(s); w++) words.push(cs.getWord(s, w));
            shifts.push({ shift: s, text: words.join(" ") });
        }
        return shifts;
    }

    // PUBLIC — sorted entry i: keyword, context, URL and the original line (description)
    getEntry(i) {
        const alpha = this.#alphabetizer;
        const words = [];
        for (let w = 1; w <= alpha.getWordCount(i); w++) words.push(alpha.getWord(i, w));
        const l = alpha.getLineOf(i);
        return {
            position: i,
            keyword: words[0],
            context: words.slice(1).join(" "),
            line: l,
            url: this.#lineStorage.getUrl(l),
            description: this.getLine(l).text
        };
    }

    // PUBLIC — the full sorted index
    getIndex() {
        const entries = [];
        for (let i = 1; i <= this.#alphabetizer.getCount(); i++) entries.push(this.getEntry(i));
        return entries;
    }

    // PUBLIC — counts shown on the page
    getStats() {
        return {
            lines: this.#lineStorage.getLineCount(),
            shifts: this.#circularShift.getShiftCount(),
            noiseShifts: this.#circularShift.getNoiseCount(),
            entries: this.#alphabetizer.getCount()
        };
    }

    // PUBLIC — writes lines fromLine..last to a JSON file [{ text, url }]
    saveLines(path, fromLine) {
        const saved = [];
        for (let l = fromLine; l <= this.#lineStorage.getLineCount(); l++) {
            const line = this.getLine(l);
            saved.push({ text: line.text, url: line.url });
        }
        fs.writeFileSync(path, JSON.stringify(saved, null, 2) + "\n");
    }
}

module.exports = Output;
