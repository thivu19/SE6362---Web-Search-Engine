"use strict";

// Integration tests: MasterControl with the real corpus and noise-word files.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const MasterControl = require("../src/kwic/MasterControl");

const DATA = path.join(__dirname, "..", "data");

function freshSystem() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kwic-test-"));
    const paths = {
        corpus: path.join(DATA, "corpus.json"),
        savedLines: path.join(dir, "user-lines.json"),
        noiseWords: path.join(DATA, "noise-words.json")
    };
    const mc = new MasterControl(paths);
    mc.start();
    return { mc, paths };
}

test("TC-23 start() indexes the whole corpus and the index is in order", () => {
    const { mc } = freshSystem();
    const corpus = JSON.parse(fs.readFileSync(path.join(DATA, "corpus.json"), "utf8"));
    const { lines, entries, stats } = mc.getIndex();
    assert.equal(lines.length, corpus.length);
    assert.equal(stats.entries, stats.shifts);
    for (let i = 1; i < entries.length; i++) {
        const a = `${entries[i - 1].keyword} ${entries[i - 1].context}`.trim().toLowerCase().split(" ");
        const b = `${entries[i].keyword} ${entries[i].context}`.trim().toLowerCase().split(" ");
        let cmp = 0;
        for (let w = 0; w < Math.min(a.length, b.length) && cmp === 0; w++) cmp = a[w] < b[w] ? -1 : a[w] > b[w] ? 1 : 0;
        assert.ok((cmp || a.length - b.length) <= 0, `index out of order at position ${i}`);
    }
});

test("TC-09 search results carry keyword, context, description and URL", () => {
    const r = freshSystem().mc.search("Software Architecture");
    assert.ok(r.results.length >= 2);
    for (const hit of r.results) {
        assert.equal(hit.keyword.toLowerCase(), "software");
        assert.match(hit.context.toLowerCase(), /^architecture/);
        assert.ok(hit.url.startsWith("https://"));
        assert.ok(hit.description.length > 0);
    }
});

test("TC-05 search is case-insensitive", () => {
    const { mc } = freshSystem();
    assert.deepEqual(mc.search("SOFTWARE").results, mc.search("software").results);
});

test("TC-03 searching a noise word returns nothing", () => {
    assert.equal(freshSystem().mc.search("the").results.length, 0);
});

test("TC-01 / TC-24 addLines indexes new lines and saves them", () => {
    const { mc, paths } = freshSystem();
    const r = mc.addLines("Pipes and filters connect components https://kwic.test/pipes\n\nPipes and filters connect components");
    assert.equal(r.added.length, 1);
    assert.equal(r.rejected.length, 1);
    const hits = mc.search("pipes").results;
    assert.equal(hits.length, 1);
    assert.equal(hits[0].url, "https://kwic.test/pipes");
    const saved = JSON.parse(fs.readFileSync(paths.savedLines, "utf8"));
    assert.deepEqual(saved, [{ text: "Pipes and filters connect components", url: "https://kwic.test/pipes" }]);
});

test("TC-25 saved lines are reloaded on restart (FR8)", () => {
    const { mc, paths } = freshSystem();
    mc.addLines("Implicit invocation broadcasts events");
    const restarted = new MasterControl(paths);
    restarted.start();
    assert.equal(restarted.search("implicit invocation").results.length, 1);
});

test("TC-10 search over the corpus finishes well under 2 seconds", () => {
    const r = freshSystem().mc.search("search engine");
    assert.ok(r.elapsedMs < 2000, `${r.elapsedMs} ms`);
});

test("TC-26 scaling: 2,000 added lines index and search within the targets", () => {
    const { mc } = freshSystem();
    const words = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "kappa", "lambda"];
    const lines = [];
    for (let i = 0; i < 2000; i++) lines.push(`${words[i % 8]} ${words[(i * 3) % 8]} item${i} ${words[(i * 5) % 8]} record${i}`);
    const t0 = Date.now();
    for (let k = 0; k < 2000; k += 100) mc.addLines(lines.slice(k, k + 100).join("\n"));
    const indexMs = Date.now() - t0;
    const s = mc.search("gamma");
    assert.ok(s.results.length > 0);
    assert.ok(s.elapsedMs < 2000, `search ${s.elapsedMs} ms`);
    assert.ok(indexMs < 10000, `indexing ${indexMs} ms`);
});
