import fs from 'fs';
import zlib from 'zlib';
const DATABASE = []; 
const compressedBuffer = fs.readFileSync('wet.paths.gz');
const decompressedText = zlib.gunzipSync(compressedBuffer).toString('utf-8');
const allPaths = decompressedText.split('\n').map(line => line.trim()).filter(Boolean);
let targetUri = "";
let extractedText = "";

for (const record of DATABASE) {
    if (record.includes('WARC-Target-URI:')) {
        
        // Extract the URI variable
        const uriMatch = record.match(/WARC-Target-URI:\s*([^\r\n]+)/);
        targetUri = uriMatch ? uriMatch[1] : "";

        // Extract the text body variable (WET separates metadata from content via a double newline)
        const parts = record.split('\r\n\r\n');
        extractedText = parts.slice(1).join('\r\n\r\n').trim(); 
        DATABASE.push('$[targetURI] + " , " + $[extractedText]');

    }
}
const LineStorage = (function () {
    let storage = []; 

    function tokenize(lineText) {
        return lineText.trim().split(/\s+/).filter(Boolean);
    }

    return {
        // PUBLIC
        LoadLines(lines) {
            storage = lines.map(tokenize);
        },
        Word(l) {
            return storage[l] ? storage[l].length : 0;
        },
        WordAt(l, w) {
            return storage[l][w];
        },
        LineCount() {
            return storage.length;
        }
    };
})();

const Input = (function () {
    return {
        ReadAndStore(lines) {
            LineStorage.LoadLines(lines);
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

    function csSetchar(s, words) {
        
        shifts[s] = words;
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
                    csSetchar(s, rotated);
                    s++;
                }
            }
        },
        CSWord(s) {
            return shifts[s].length;
        },
        CSWordAt(s, w) {
            return shifts[s][w];
        },
        CSCount() {
            return shifts.length;
        },
        CSIsNoise(word) {
            return noiseWords.has(word.toLowerCase());
        }
    };
})();

const AlphabeticShift = (function () {
    let order = [];

    function sortKeyFor(s) {
        const n = CircularShift.CSWord(s);
        for (let w = 0; w < n; w++) {
            const word = CircularShift.CSWordAt(s, w);
            if (!CircularShift.CSIsNoise(word)) return word.toLowerCase();
        }
        return CircularShift.CSWordAt(s, 0).toLowerCase();
    }

    return {
        Alpha() {
            const keys = [];
            for (let s = 0; s < CircularShift.CSCount(); s++) {
                keys.push({ s, key: sortKeyFor(s) });
            }
            keys.sort((a, b) => a.key.localeCompare(b.key));
            order = keys.map(k => k.s);
        },
        ith(i) {
            return order[i];
        },
        Count() {
            return order.length;
        }
    };
})();

const Output = (function () {
    function restOf(s) {
        const n = CircularShift.CSWord(s);
        const words = [];
        for (let w = 1; w < n; w++) words.push(CircularShift.CSWordAt(s, w));
        return words.join(" ");
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function ensureStyles() {
        if (document.getElementById("kwic-generated-styles")) return;
        const style = document.createElement("style");
        style.id = "kwic-generated-styles";
        style.textContent = `
            #kwicResults {
                width: min(calc(100% - 40px), var(--max-width, 1120px));
                margin: 30px auto 0;
            }
            #kwicResults .kwic-status {
                margin: 0 0 14px;
                color: var(--text-muted, #627b8e);
                font-size: 0.9rem;
            }
            #kwicResults table {
                width: 100%;
                border-collapse: collapse;
                background: var(--surface, #fff);
                border: 1px solid var(--border, #cfe3f1);
                border-radius: 12px;
                overflow: hidden;
            }
            #kwicResults th {
                text-align: left;
                font-size: 0.72rem;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: var(--primary-dark, #175d90);
                background: var(--surface-tint, #e5f4ff);
                padding: 10px 14px;
            }
            #kwicResults td {
                padding: 10px 14px;
                border-top: 1px solid var(--border, #cfe3f1);
                font-size: 0.92rem;
                color: var(--text, #17324a);
                vertical-align: top;
            }
            #kwicResults td.kwic-keyword {
                white-space: nowrap;
                font-weight: 700;
                color: var(--primary-dark, #175d90);
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
            const hero = document.querySelector(".hero");
            (hero || document.body).insertAdjacentElement("afterend", container);
        }
        return container;
    }

    return {
        // PUBLIC — called by Master Control
        WriteFormatted(results, query, fromCache) {
            ensureStyles();
            const container = ensureContainer();
            container.innerHTML = "";

            const status = document.createElement("p");
            status.className = "kwic-status";
            status.textContent = results.length
                ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"${fromCache ? " (from this session's cache)" : ""}`
                : `No results for "${query}"`;
            container.appendChild(status);

            if (!results.length) return;

            const table = document.createElement("table");
            table.innerHTML = `
                <thead>
                    <tr><th style="width:160px;">Keyword</th><th>Context</th></tr>
                </thead>
            `;
            const tbody = document.createElement("tbody");
            results.forEach(r => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="kwic-keyword">${escapeHtml(r.keyword)}</td>
                    <td>${escapeHtml(r.rest)}</td>
                `;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            container.appendChild(table);
        },

        // Builds the result list for a query from the already-sorted shifts.
        // Kept here (rather than in AlphabeticShift) because "what counts as
        // a match" is a display/search concern, not a sorting concern.
        Search(query) {
            const q = query.trim().toLowerCase();
            const results = [];
            if (!q) return results;
            for (let i = 0; i < AlphabeticShift.Count(); i++) {
                const s = AlphabeticShift.ith(i);
                const keyword = CircularShift.CSWordAt(s, 0);
                if (keyword.toLowerCase().startsWith(q)) {
                    results.push({ keyword, rest: restOf(s) });
                }
            }
            return results;
        }
    };
})();

// Search cache — sessionStorage, scoped to this browser tab/session

const SearchCache = (function () {
    const STORAGE_KEY = "kwicSearchHistory";

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
            const entry = readAll()[query.trim().toLowerCase()];
            return entry ? entry.results : null;
        },
        set(query, results) {
            const all = readAll();
            all[query.trim().toLowerCase()] = { results, timestamp: Date.now() };
            writeAll(all);
        }
    };
})();

// Master Control
const MasterControl = (function () {
    let indexBuilt = false;

    function buildIndexOnce() {
        if (indexBuilt) return;
        Input.ReadAndStore(DATABASE);       // PRIVATE-to-Input, triggered by MC
        CircularShift.Setup();              // PUBLIC
        AlphabeticShift.Alpha();            // PUBLIC
        indexBuilt = true;
    }

    return {
        // PUBLIC — the single entry point the page calls
        Sequence(query) {
            buildIndexOnce();

            const cached = SearchCache.get(query);
            if (cached) {
                Output.WriteFormatted(cached, query, true);
                return;
            }

            const results = Output.Search(query);
            SearchCache.set(query, results);
            Output.WriteFormatted(results, query, false);
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
        // The button is type="submit" with no form action, so without this
        // the page would just reload on every search instead of showing results.
        form.addEventListener("submit", (e) => e.preventDefault());
    }
});