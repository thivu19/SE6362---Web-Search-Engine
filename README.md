# KWIC Search Engine — SE 6362 Team 2

A KWIC (Key Word in Context) index and search engine built as Parnas Modularization 2 abstract data types, with an incremental circular shift and alphabetizer.

## Run

Requires Node.js 18 or later. There are no npm dependencies.

```bash
npm start
```

Open http://localhost:3000. Set `PORT` to use another port.

## Test

```bash
npm test
```

Runs the unit and integration tests in `test/` (Node's built-in test runner).

```bash
npm run test:record
```

Runs the same tests and saves the output, with date and Node version, to `docs/test-results.md` for the report.

## Layout

| Path | What |
| --- | --- |
| `src/kwic/` | One class per ADT: MasterControl, Input, LineStorage, CircularShift, Alphabetizer, Output |
| `server.js` | Serves the page and a JSON API: `GET /api/search?q=…`, `GET /api/index`, `POST /api/lines` |
| `home.html`, `styles.css`, `script.js` | Front end; `script.js` only calls the API and renders the results |
| `test/` | Unit tests per ADT and integration tests through MasterControl |
| `scripts/record-test-results.js` | Used by `npm run test:record` |
| `data/corpus.json` | Seed lines (description + URL) |
| `data/noise-words.json` | Configurable noise-word list |
| `data/user-lines.json` | Lines added through the page (created on first add) |

## Hosting

The site now needs a Node server, so it cannot be opened as a static file or on GitHub Pages. Any Node host works (Render, Railway, Fly.io): use start command `npm start`, and the host sets `PORT`. On hosts with ephemeral disks, added lines last only until a redeploy.
