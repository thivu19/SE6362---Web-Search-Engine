const DATABASE = [
  "Software architecture defines the high level structure of a system",
  "A search engine indexes documents to allow fast information retrieval",
  "Information retrieval systems rank documents by relevance to a query",
  "The KWIC index displays every keyword in the context of its line",
  "Coupling and cohesion are core principles of software architecture",
  "A web search engine crawls pages and builds an inverted index",
  "Object oriented design encapsulates data behind public interfaces",
  "Modularization hides design decisions that are likely to change",
  "Circular shift rotates each word of a line to the front in turn",
  "Alphabetic shift sorts all circular shifts into ascending order",
  "A module should hide one design decision likely to change independently",
  "Information hiding means objects only communicate through public methods",
  "High cohesion and low coupling make a system easier to maintain",
  "A caller invokes the public interface of the module it depends on",
  "The callee method must be public for any external module to reach it",
  "Functional cohesion means a routine performs exactly one well defined task",
  "Sequential cohesion occurs when the output of one step feeds the next",
  "An inverted index maps each term to the documents that contain it",
  "A search engine ranks pages using relevance signals and link structure",
  "Natural language processing extracts meaning from unstructured text",
  "A database schema defines the tables columns and relationships in a system",
  "Indexing speeds up queries at the cost of extra storage and write time",
  "A hash table provides average constant time lookup for a given key",
  "Binary search finds a target value in a sorted array efficiently",
  "Merge sort divides an array in half and combines the sorted halves",
  "A compiler translates source code into an executable form",
  "A lexer breaks source text into a stream of tokens for the parser",
  "A parser builds a syntax tree from a stream of tokens",
  "An optimizer rewrites code to improve performance without changing behavior",
  "A cache stores recent results so repeated requests skip recomputation",
  "A session only persists in the browser until the tab or window closes",
  "Local storage persists data in the browser across sessions and reloads",
  "An application programming interface defines how two systems communicate",
  "REST APIs expose resources through a fixed set of HTTP methods",
  "A client sends a request and a server returns a formatted response",
  "Version control tracks changes to source code over time",
  "A pull request proposes a set of changes for review before merging",
  "Unit tests verify that an individual function behaves as expected",
  "Integration tests verify that multiple components work together correctly",
  "A prototype is a working model used to validate a design early",
  "there was a circle of life",
  "the beauty and the beast was a great movie and story",
  "the cat ran over the dog on the hill"
];

const LineStorage = (function () {
    let storage = [];

    function tokenize(lineText) {
        return lineText.trim().split(/\s+/).filter(Boolean);
    }

    return {
        // PUBLIC
        LoadLines(lines) {
            storage = lines.map(tokenize).filter(words => words.length);
        },
        Word(l) {
            return storage[l] ? storage[l].length : 0;
        },
        WordAt(l, w) {
            return storage[l] ? storage[l][w] : undefined;
        },
        LineCount() {
            return storage.length;
        }
    };
})();

const Input = (function () {
    return {
        ReadAndStore() {
            LineStorage.LoadLines(DATABASE);
        }
    };
})();

// Circular Shift + Noise Eliminator
const CircularShift = (function () {
    let shifts = [];
    const noiseWords = new Set([
        "a", "an", "the", "of", "to", "in", "is", "and", "for",
        "on", "by", "its", "are", "that", "this"
    ]);

    function csSetchar(s, line, words) {
        shifts[s] = { line, words };
    }

    return {
        Setup() {
            shifts = [];
            let s = 0;
            for (let l = 0; l < LineStorage.LineCount(); l++) {
                const n = LineStorage.Word(l);
                for (let start = 0; start < n; start++) {
                    const rotated = [];
                    for (let w = 0; w < n; w++) {
                        rotated.push(LineStorage.WordAt(l, (w + start) % n));
                    }
                    csSetchar(s, l, rotated);
                    s++;
                }
            }
        },
        CSCount() {
            return shifts.length;
        },
        CSWord(s) {
            return shifts[s] ? shifts[s].words.length : 0;
        },
        CSWordAt(s, w) {
            return shifts[s] ? shifts[s].words[w] : undefined;
        },
        CSLineOf(s) {
            return shifts[s] ? shifts[s].line : -1;
        },
        CSIsNoise(word) {
            return noiseWords.has(String(word).toLowerCase());
        }
    };
})();

const AlphabeticShift = (function () {
    let order = [];

    function sortKeyFor(s) {
        const words = [];
        for (let w = 0; w < CircularShift.CSWord(s); w++) {
            words.push(CircularShift.CSWordAt(s, w).toLowerCase());
        }
        return words.join(" ");
    }

    return {
        Alpha() {
            const keys = [];
            for (let s = 0; s < CircularShift.CSCount(); s++) {
                if (CircularShift.CSIsNoise(CircularShift.CSWordAt(s, 0))) continue;
                keys.push({ s, key: sortKeyFor(s) });
            }
            keys.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.s - b.s));
            order = keys.map(k => k.s);
        },
        Count() {
            return order.length;
        },
        ith(i) {
            return order[i];
        }
    };
})();

const Output = (function () {
    function wordsOf(s, from) {
        const words = [];
        for (let w = from; w < CircularShift.CSWord(s); w++) {
            words.push(CircularShift.CSWordAt(s, w));
        }
        return words.join(" ");
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function shiftHtml(s) {
        return `<b>${escapeHtml(CircularShift.CSWordAt(s, 0))}</b> ${escapeHtml(wordsOf(s, 1))}`;
    }

    function row(cells, className) {
        return `<tr${className ? ` class="${className}"` : ""}>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
    }

    function table(headers, rows) {
        return `<div class="kwic-table"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
    }

    function step(title, call, body) {
        return `<h3>${title}</h3><p class="kwic-call">${call}</p>${body}`;
    }

    function ensureStyles() {
        if (document.getElementById("kwic-generated-styles")) return;
        const style = document.createElement("style");
        style.id = "kwic-generated-styles";
        style.textContent = `
        #kwicResults {
        max-width: 1100px;
        margin: 36px auto 48px;
        padding: 0 24px;
        color: #1f2937;
        box-sizing: border-box;
        }
        #kwicResults > p:first-child {
            margin: 0 0 20px;
            font-size: 16px;
            color: #475569;
        }

        #kwicResults h3 {
            margin: 28px 0 8px;
            padding: 0;
            color: #0f2a44;
            font-size: 18px;
            font-weight: 700;
        }

        #kwicResults p {
            margin: 6px 0;
            line-height: 1.5;
        }

        #kwicResults .kwic-call {
            display: inline-block;
            margin-bottom: 10px;
            padding: 6px 10px;
            border-radius: 6px;
            background: #f1f5f9;
            color: #64748b;
            font-family: monospace;
            font-size: 12px;
        }

        #kwicResults .kwic-table {
            width: 100%;
            overflow-x: auto;
            margin: 12px 0 24px;
            border: 1px solid #dbe2ea;
            border-radius: 10px;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(15, 42, 68, 0.06);
        }

        #kwicResults table {
            width: 100%;
            min-width: 600px;
            border-collapse: collapse;
            font-size: 14px;
        }

        #kwicResults th,
        #kwicResults td {
            padding: 11px 14px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            vertical-align: top;
            line-height: 1.45;
        }

        #kwicResults th {
            background: #f1f5f9;
            color: #0f2a44;
            font-weight: 700;
            white-space: nowrap;
        }

        #kwicResults tr:last-child td {
            border-bottom: none;
        }

        #kwicResults tbody tr:hover {
            background: #f8fafc;
        }

        #kwicResults tr.kwic-removed td {
            color: #94a3b8;
            background: #f8fafc;
        }

        #kwicResults details {
            margin: 12px 0 28px;
            border: 1px solid #dbe2ea;
            border-radius: 8px;
            background: #ffffff;
        }

        #kwicResults summary {
            padding: 12px 14px;
            cursor: pointer;
            color: #0f2a44;
            font-weight: 600;
        }

        #kwicResults details > .kwic-table {
            margin: 0;
            border: none;
            border-top: 1px solid #dbe2ea;
            border-radius: 0;
            box-shadow: none;
        }

        #kwicResults b {
            color: #0f2a44;
        }

        @media (max-width: 768px) {
            #kwicResults {
                margin-top: 24px;
                padding: 0 16px;
            }

            #kwicResults h3 {
                font-size: 17px;
            }

            #kwicResults table {
                min-width: 550px;
            }
        }
        `;
        document.head.appendChild(style);
    }

    function ensureContainer() {
        let container = document.getElementById("kwicResults");
        if (!container) {
            container = document.createElement("section");
            container.id = "kwicResults";
            container.setAttribute("aria-live", "polite");
            const search = document.getElementById("search");
            (search || document.body).insertAdjacentElement("afterend", container);
        }
        return container;
    }

    return {
        // PUBLIC — called by Master Control
        WriteFormatted(results, query, fromCache) {
            ensureStyles();
            const container = ensureContainer();
            const q = escapeHtml(query.trim());

            if (!results.length) {
                const noise = CircularShift.CSIsNoise(query.trim());
                container.innerHTML = `<p>No results for "${q}"${noise ? " (it is a noise word)" : ""}.</p>`;
                return;
            }

            const lines = [...new Set(results.map(r => r.line))].sort((a, b) => a - b);
            const lineSet = new Set(lines);
            const removed = CircularShift.CSCount() - AlphabeticShift.Count();

            const storedRows = lines.map(l => {
                const words = [];
                for (let w = 0; w < LineStorage.Word(l); w++) words.push(escapeHtml(LineStorage.WordAt(l, w)));
                return row([l + 1, LineStorage.Word(l), words.join(" | ")]);
            });

            const shiftRows = [];
            for (let s = 0; s < CircularShift.CSCount(); s++) {
                const l = CircularShift.CSLineOf(s);
                if (!lineSet.has(l)) continue;
                const noise = CircularShift.CSIsNoise(CircularShift.CSWordAt(s, 0));
                shiftRows.push(row([l + 1, shiftHtml(s), noise ? "removed (noise word)" : ""], noise ? "kwic-removed" : ""));
            }

            const sortedRows = [];
            const fullRows = [];
            for (let i = 0; i < AlphabeticShift.Count(); i++) {
                const s = AlphabeticShift.ith(i);
                const l = CircularShift.CSLineOf(s);
                const cells = [i + 1, l + 1, shiftHtml(s)];
                fullRows.push(row(cells));
                if (lineSet.has(l)) sortedRows.push(row(cells));
            }

            const resultRows = results.map(r =>
                row([`<b>${escapeHtml(r.keyword)}</b>`, escapeHtml(r.rest), r.line + 1])
            );

            container.innerHTML = `
                <p><b>${results.length} result${results.length === 1 ? "" : "s"} for "${q}"</b>${fromCache ? " (cached)" : ""}</p>
                ${step("Step 1: Input", "Input.ReadAndStore() → LineStorage.LoadLines()",
                    `<p>${LineStorage.LineCount()} lines stored. Matching lines:</p>` +
                    table(["Line", "Words", "Stored words"], storedRows))}
                ${step("Step 2: Circular Shift", "CircularShift.Setup()",
                    `<p>${CircularShift.CSCount()} shifts created. Shifts of the matching lines:</p>` +
                    table(["Line", "Shift", "Note"], shiftRows))}
                ${step("Step 3: Alphabetic Shift", "AlphabeticShift.Alpha()",
                    `<p>${AlphabeticShift.Count()} shifts sorted, ${removed} removed for starting with a noise word.</p>` +
                    table(["Position", "Line", "Shift"], sortedRows) +
                    `<details><summary>Show full sorted index (${AlphabeticShift.Count()})</summary>${table(["Position", "Line", "Shift"], fullRows)}</details>`)}
                ${step("Step 4: Output", "Output.Search() → Output.WriteFormatted()",
                    table(["Keyword", "Context", "Line"], resultRows))}
            `;
        },

        // Builds the result list for a query from the already-sorted shifts.
        // Kept here (rather than in AlphabeticShift) because "what counts as
        // a match" is a display/search concern, not a sorting concern.
        Search(query) {
            const q = query.trim().toLowerCase().replace(/\s+/g, " ");
            const results = [];
            if (!q) return results;
            for (let i = 0; i < AlphabeticShift.Count(); i++) {
                const s = AlphabeticShift.ith(i);
                if (wordsOf(s, 0).toLowerCase().startsWith(q)) {
                    results.push({
                        line: CircularShift.CSLineOf(s),
                        keyword: CircularShift.CSWordAt(s, 0),
                        rest: wordsOf(s, 1)
                    });
                }
            }
            return results;
        }
    };
})();

// Search cache — sessionStorage, scoped to this browser tab/session

const SearchCache = (function () {
    const STORAGE_KEY = "kwicSearchHistory.v3";

    function keyFor(query) {
        return query.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function readAll() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function writeAll(obj) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {
            // sessionStorage unavailable (e.g. private browsing) — fail silently,
            // search still works, it just won't be cached
        }
    }

    return {
        get(query) {
            const entry = readAll()[keyFor(query)];
            return entry ? entry.results : null;
        },
        set(query, results) {
            const all = readAll();
            all[keyFor(query)] = { results, timestamp: Date.now() };
            writeAll(all);
        }
    };
})();

// Master Control
const MasterControl = (function () {
    let indexBuilt = false;

    function buildIndexOnce() {
        if (indexBuilt) return;
        Input.ReadAndStore();
        CircularShift.Setup();              // PUBLIC
        AlphabeticShift.Alpha();            // PUBLIC
        indexBuilt = true;
    }

    return {
        // PUBLIC — the single entry point the page calls
        Sequence(query) {
            buildIndexOnce();

            const cached = SearchCache.get(query);
            const results = cached || Output.Search(query);
            if (!cached) SearchCache.set(query, results);
            Output.WriteFormatted(results, query, Boolean(cached));
        }
    };
})();

// Page wiring
let input = "";

function getInput() {
    input = document.querySelector("#searchInput").value;
    return input;
}

function mastercontrol() {
    const query = getInput();
    if (!query || !query.trim()) return;
    MasterControl.Sequence(query);
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            mastercontrol();
        });
    }
});
