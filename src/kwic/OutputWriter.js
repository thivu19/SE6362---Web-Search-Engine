"use strict";

const fs = require("fs");

// OutputWriter — hides the output format: how lines, shifts and index entries
// are presented to the web page, and how user lines are saved to disk.

class OutputWriter {
    #lineStorage;
    #circularShifter;
    #alphabetizer;

    constructor(lineStorage, circularShifter, alphabetizer) {
        this.#lineStorage = lineStorage;
        this.#circularShifter = circularShifter;
        this.#alphabetizer = alphabetizer;
    }

    // PUBLIC — stored line l: { line, text, words, wordCount, url, source }
    formatLine(l) {
        const ls = this.#lineStorage;
        const words = [];
        for (let w = 1; w <= ls.getWordCount(l); w++) words.push(ls.getWord(l, w));
        return { line: l, text: words.join(" "), words, wordCount: words.length, url: ls.getUrl(l), source: ls.getSource(l) };
    }

    // PUBLIC — all shifts of line l, kept and eliminated
    formatShiftsOfLine(l) {
        const cs = this.#circularShifter;
        const kept = cs.getShiftsOfLine(l).map(s => ({ shift: s, text: this.#shiftWords(s).join(" "), eliminated: false }));        const eliminated = cs.getEliminatedShiftsOfLine(l).map(words => ({ shift: null, text: words.join(" "), eliminated: true }));
        return kept.concat(eliminated);
    }

    // PUBLIC — sorted index entry at position i: keyword + context + URL + description
    formatIndexEntry(i) {
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
            description: this.formatLine(l).text
        };
    }

    // PUBLIC — writes every user-added line to the save file (JSON)
    saveUserLines(path) {
        const ls = this.#lineStorage;
        const saved = [];
        for (let l = 1; l <= ls.getLineCount(); l++) {
            if (ls.getSource(l) !== "user") continue;
            const line = this.formatLine(l);
            saved.push({ text: line.text, url: line.url });
        }
        fs.writeFileSync(path, JSON.stringify(saved, null, 2) + "\n");
    }

    #shiftWords(s) {
        const cs = this.#circularShifter;
        const words = [];
        for (let w = 1; w <= cs.getWordCount(s); w++) words.push(cs.getWord(s, w));
        return words;
    }
}

module.exports = OutputWriter;
