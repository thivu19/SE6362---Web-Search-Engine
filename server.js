"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const MasterControl = require("./src/kwic/MasterControl");

// Web server: serves the page and exposes MasterControl's public operations as a JSON API.
//   GET  /api/search?q=...   search the sorted index
//   GET  /api/index          all stored lines + the full sorted index
//   POST /api/lines {text}   add lines (newline- or $-separated)

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");
const MAX_BODY_BYTES = 100 * 1024;

const STATIC_FILES = {
    "/": ["home.html", "text/html; charset=utf-8"],
    "/home.html": ["home.html", "text/html; charset=utf-8"],
    "/styles.css": ["styles.css", "text/css; charset=utf-8"],
    "/script.js": ["script.js", "text/javascript; charset=utf-8"]
};

const kwic = new MasterControl({
    corpus: path.join(DATA, "corpus.json"),
    savedLines: path.join(DATA, "user-lines.json"),
    noiseWords: path.join(DATA, "noise-words.json")
});
kwic.start();

function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on("data", chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error("Request body too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

async function handleApi(req, res, url) {
    if (req.method === "GET" && url.pathname === "/api/search") {
        const q = url.searchParams.get("q") || "";
        if (!q.trim()) return sendJson(res, 400, { error: "Enter a keyword or phrase." });
        return sendJson(res, 200, kwic.search(q));
    }
    if (req.method === "GET" && url.pathname === "/api/index") {
        return sendJson(res, 200, kwic.getIndex());
    }
    if (req.method === "POST" && url.pathname === "/api/lines") {
        let body;
        try {
            body = JSON.parse(await readBody(req) || "{}");
        } catch (e) {
            return sendJson(res, 400, { error: "Request must be JSON: { \"text\": \"...\" }" });
        }
        if (typeof body.text !== "string" || !body.text.trim()) {
            return sendJson(res, 400, { error: "Enter at least one line." });
        }
        return sendJson(res, 200, kwic.addLines(body.text));
    }
    return sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
        if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);

        const file = STATIC_FILES[url.pathname];
        if (req.method !== "GET" || !file) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Not found");
        }
        res.writeHead(200, { "Content-Type": file[1] });
        fs.createReadStream(path.join(ROOT, file[0])).pipe(res);
    } catch (err) {
        console.error(err);
        sendJson(res, 500, { error: "Server error" });
    }
});

server.listen(PORT, () => {
    const s = kwic.getIndex().stats;
    console.log(`KWIC server on http://localhost:${PORT} — ${s.lines} lines, ${s.entries} index entries`);
});
