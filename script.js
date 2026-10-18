// Front end only: sends requests to the KWIC server and renders the responses.
// All KWIC processing (storage, circular shift, alphabetizing, search) runs on
// the server in src/kwic/.

const Api = {
    async search(query) {
        return request(`/api/search?q=${encodeURIComponent(query)}`);
    },
    async addLines(text) {
        return request("/api/lines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
    },
    async index() {
        return request("/api/index");
    }
};

async function request(url, options) {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
}

// Rendering helpers

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function table(headers, rows) {
    return `<div class="kwic-table"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.join("")}</tbody></table></div>`;
}

function row(cells, className) {
    return `<tr${className ? ` class="${className}"` : ""}>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
}

function link(url) {
    return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>` : "—";
}

function shiftHtml(keyword, context) {
    return `<b>${escapeHtml(keyword)}</b> ${escapeHtml(context)}`;
}

function step(title, call, body) {
    return `<h3>${title}</h3><p class="kwic-call">${call}</p>${body}`;
}

function plural(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Search

function renderSearch(data) {
    const container = document.getElementById("kwicResults");
    const q = escapeHtml(data.query.trim());
    const s = data.stats;
    const meta = `<p class="kwic-meta">Matched as whole words, ignoring case · ` +
        `${data.elapsedMs.toFixed(2)} ms on the server · ` +
        `index holds ${s.lines} lines and ${s.entries} entries</p>`;

    if (!data.results.length) {
        container.innerHTML = `<p class="kwic-summary">No results for "${q}"</p>${meta}` +
            `<p class="kwic-message">No index entry starts with these words. ` +
            `Noise words (such as "the" or "of") are never keywords. Try fewer words or a different keyword.</p>`;
        return;
    }

    const lineRows = data.lines.map(l =>
        row([l.line, l.words.length, l.words.map(escapeHtml).join(" | "), link(l.url)]));

    const shiftRows = [];
    data.lines.forEach(l => l.shifts.forEach(sh => {
        const [first, ...rest] = sh.text.split(" ");
        shiftRows.push(row([l.line, sh.shift, shiftHtml(first, rest.join(" "))]));
    }));

    const sortedRows = data.sortedEntries.map(e => row([e.position, e.line, shiftHtml(e.keyword, e.context)]));

    const resultRows = data.results.map(r =>
        row([`<b>${escapeHtml(r.keyword)}</b>`, escapeHtml(r.context), escapeHtml(r.description), link(r.url)]));

    container.innerHTML = `
        <p class="kwic-summary">${plural(data.results.length, "result")} for "${q}"</p>
        ${meta}
        ${step("Step 1: Input", "Input.getNextLine() → LineStorage.setLine(words, url)",
            `<p>${plural(s.lines, "line")} stored. Lines that produced a match:</p>` +
            table(["Line", "Words", "Stored words", "URL"], lineRows))}
        ${step("Step 2: Circular Shift", "CircularShift.setShifts(l)",
            `<p>${s.shifts} shifts kept, ${s.noiseShifts} dropped for starting with a noise word. Kept shifts of the matching lines:</p>` +
            table(["Line", "Shift #", "Shift"], shiftRows))}
        ${step("Step 3: Alphabetize", "Alphabetizer.alph(first, last) — merged into the sorted index",
            `<p>Sorted positions of the matching lines' shifts (full index is in the Index section below):</p>` +
            table(["Position", "Line", "Shift"], sortedRows))}
        ${step("Step 4: Output", "Alphabetizer.getMatches(words) → Output.getEntry(i)",
            table(["Keyword", "Context", "Description", "URL"], resultRows))}
    `;
}

async function runSearch(query) {
    if (!query || !query.trim()) return;
    const container = document.getElementById("kwicResults");
    try {
        renderSearch(await Api.search(query));
    } catch (err) {
        container.innerHTML = `<p class="kwic-message">${escapeHtml(err.message)}</p>`;
    }
    container.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Add lines

async function submitLines() {
    const textarea = document.getElementById("linesInput");
    const status = document.getElementById("addStatus");
    const button = document.getElementById("addButton");
    if (!textarea.value.trim()) {
        status.textContent = "Enter at least one line.";
        return;
    }
    button.disabled = true;
    try {
        const data = await Api.addLines(textarea.value);
        let html = `${plural(data.added.length, "line")} added and indexed` +
            (data.added.length ? ` (lines ${data.added.map(l => l.line).join(", ")}).` : ".");
        if (data.rejected.length) {
            html += ` ${plural(data.rejected.length, "line")} skipped:<ul>` +
                data.rejected.map(r => `<li>${escapeHtml(r.text)} — ${escapeHtml(r.reason)}</li>`).join("") + "</ul>";
        }
        status.innerHTML = html;
        if (data.added.length) textarea.value = "";
        refreshIndexViews();
    } catch (err) {
        status.textContent = err.message;
    } finally {
        button.disabled = false;
    }
}

// Index contents (all stored lines + full sorted index)

async function refreshIndexViews() {
    const statsEl = document.getElementById("indexStats");
    try {
        const data = await Api.index();
        document.getElementById("linesBody").innerHTML = table(["Line", "Text", "Words", "URL"],
            data.lines.map(l => row([l.line, escapeHtml(l.text), l.words.length, link(l.url)])));
        document.getElementById("indexBody").innerHTML = table(["Position", "Keyword", "Context", "Line", "URL"],
            data.entries.map(e => row([e.position, `<b>${escapeHtml(e.keyword)}</b>`, escapeHtml(e.context), e.line, link(e.url)])));
        const stats = data.stats;
        statsEl.textContent = `${plural(stats.lines, "line")} stored · ${stats.shifts} circular shifts kept · ` +
            `${stats.noiseShifts} dropped as noise · ${stats.entries} entries in the sorted index.`;
    } catch (err) {
        statsEl.textContent = `Could not load the index: ${err.message}`;
    }
}

// Page wiring

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("searchInput");

    document.getElementById("searchForm").addEventListener("submit", e => {
        e.preventDefault();
        runSearch(input.value);
    });

    document.querySelectorAll(".suggestions a[data-query]").forEach(a => {
        a.addEventListener("click", e => {
            e.preventDefault();
            input.value = a.dataset.query;
            runSearch(a.dataset.query);
        });
    });

    document.getElementById("addForm").addEventListener("submit", e => {
        e.preventDefault();
        submitLines();
    });

    refreshIndexViews();
});
