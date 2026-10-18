"use strict";

// Unit tests for each ADT, through public methods only.
// Test names start with the test-case ID used in the report.

const test = require("node:test");
const assert = require("node:assert/strict");
const Input = require("../src/kwic/Input");
const LineStorage = require("../src/kwic/LineStorage");
const CircularShift = require("../src/kwic/CircularShift");
const Alphabetizer = require("../src/kwic/Alphabetizer");

const NOISE = ["a", "an", "the", "of", "to"];

function buildIndex(lines) {
    const ls = new LineStorage();
    const cs = new CircularShift(ls, NOISE);
    const alpha = new Alphabetizer(cs);
    for (const text of lines) {
        const { first, last } = cs.setShifts(ls.setLine(text.split(/\s+/), null));
        alpha.alph(first, last);
    }
    return { ls, cs, alpha };
}

function sortedTexts(alpha) {
    const out = [];
    for (let i = 1; i <= alpha.getCount(); i++) {
        const words = [];
        for (let w = 1; w <= alpha.getWordCount(i); w++) words.push(alpha.getWord(i, w));
        out.push(words.join(" "));
    }
    return out;
}

// Reference order: word by word, ignoring case, shorter prefix first.
function compareWords(a, b) {
    const x = a.toLowerCase().split(" "), y = b.toLowerCase().split(" ");
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return x.length - y.length;
}

function storeAll(input) {
    const stored = [];
    let l;
    while ((l = input.getNextLine()) > 0) stored.push(l);
    return stored;
}

test("TC-16 LineStorage: getWordCount(l) returns the word count, getWord(l, w) the w-th word (1-based)", () => {
    const ls = new LineStorage();
    assert.equal(ls.setLine(["Clouds", "are", "white"], "https://x.test"), 1);
    assert.equal(ls.getLineCount(), 1);
    assert.equal(ls.getWordCount(1), 3);
    assert.equal(ls.getWord(1, 1), "Clouds");
    assert.equal(ls.getWord(1, 3), "white");
    assert.equal(ls.getWord(1, 4), undefined);
    assert.equal(ls.getWordCount(2), 0);
    assert.equal(ls.getUrl(1), "https://x.test");
});

test("TC-02 CircularShift: a line of n words yields n shifts (no noise words)", () => {
    const { cs } = buildIndex(["Clouds are white"]);
    assert.equal(cs.getShiftCount(), 3);
    const shifts = [1, 2, 3].map(s => [1, 2, 3].map(w => cs.getWord(s, w)).join(" "));
    assert.deepEqual(shifts, ["Clouds are white", "are white Clouds", "white Clouds are"]);
});

test("TC-03 CircularShift: shifts starting with a noise word are dropped, the word stays in context", () => {
    const { cs, alpha } = buildIndex(["The cat sat"]);
    assert.equal(cs.getShiftCount(), 2);
    assert.equal(cs.getNoiseCount(), 1);
    assert.deepEqual(sortedTexts(alpha), ["cat sat The", "sat The cat"]);
});

test("TC-04 / TC-05 Alphabetizer: ascending, case-insensitive order", () => {
    const { alpha } = buildIndex(["banana Apple", "cherry"]);
    assert.deepEqual(sortedTexts(alpha), ["Apple banana", "banana Apple", "cherry"]);
});

test("TC-17 Alphabetizer: incremental merge gives the same order as sorting everything at once", () => {
    const incremental = sortedTexts(buildIndex(["Pipes and filters", "Shared data store",
        "Implicit invocation of events", "Abstract data types hide data"]).alpha);
    assert.deepEqual(incremental, incremental.slice().reverse().sort(compareWords));
});

test("TC-18 Alphabetizer: ties are ordered by line number", () => {
    const { alpha } = buildIndex(["Data flow", "data flow diagram", "DATA FLOW"]);
    assert.deepEqual([alpha.getLineOf(1), alpha.getLineOf(2)], [1, 3]);
});

test("TC-06 Alphabetizer.getMatches: phrase query, including a shift that wraps around", () => {
    const { alpha } = buildIndex(["Software architecture matters", "Architecture of software", "Software design"]);
    const hits = alpha.getMatches(["software", "architecture"]).map(i => sortedTexts(alpha)[i - 1]);
    assert.deepEqual(hits, ["Software architecture matters", "software Architecture of"]);
});

test("TC-19 Alphabetizer.getMatches: whole words — 'index' does not match 'Indexing'", () => {
    const { alpha } = buildIndex(["Indexing speeds queries", "An inverted index maps terms"]);
    const hits = alpha.getMatches(["index"]).map(i => sortedTexts(alpha)[i - 1]);
    assert.deepEqual(hits, ["index maps terms An inverted"]);
});

test("TC-07 Alphabetizer.getMatches: unknown word returns nothing", () => {
    assert.deepEqual(buildIndex(["Clouds are white"]).alpha.getMatches(["zebra"]), []);
});

test("TC-20 Input: punctuation stripped, blank lines skipped, trailing URL kept", () => {
    const ls = new LineStorage();
    const input = new Input(ls);
    input.readText("Hello, world!\n\n   \n(KWIC) index's role https://kwic.test/x\n!!!");
    assert.deepEqual(storeAll(input), [1, 2]);
    assert.deepEqual([1, 2].map(w => ls.getWord(1, w)), ["Hello", "world"]);
    assert.deepEqual([1, 2, 3].map(w => ls.getWord(2, w)), ["KWIC", "index's", "role"]);
    assert.equal(ls.getUrl(2), "https://kwic.test/x");
    assert.equal(input.getRejected().length, 1);
    assert.match(input.getRejected()[0].reason, /no words/);
});

test("TC-21 Input: '$' also separates lines", () => {
    const input = new Input(new LineStorage());
    input.readText("one line$two line");
    assert.deepEqual(storeAll(input), [1, 2]);
});

test("TC-22 Input: duplicates (ignoring case and punctuation) are skipped and reported", () => {
    const input = new Input(new LineStorage());
    input.readText("Pipes and filters\npipes AND filters!");
    assert.deepEqual(storeAll(input), [1]);
    assert.match(input.getRejected()[0].reason, /duplicate/);
});

test("TC-08 Input: an empty query has no words", () => {
    assert.deepEqual(new Input(new LineStorage()).getQueryWords("   ?! "), []);
});

test("TC-12 Information hiding: module data is not reachable from outside", () => {
    const { ls, cs, alpha } = buildIndex(["Clouds are white"]);
    for (const obj of [ls, cs, alpha]) assert.deepEqual(Object.keys(obj), []);
    assert.equal(ls.lines, undefined);
    assert.equal(cs.shifts, undefined);
});
