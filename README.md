# KWIC Search Engine — SE 6362 Team 2

A KWIC (Key Word in Context) index and search engine built as Parnas Modularization 2 abstract data types, with an incremental circular shift and alphabetizer.

## Run

Requires Node.js 18 or later. There are no npm dependencies.

```bash
npm start
```

Open http://localhost:3000. Set `PORT` to use another port.

## Layout

| Path | What |
| --- | --- |
| `src/kwic/` | One class per ADT: MasterControl, InputReader, LineStorage, CircularShifter, Alphabetizer, IndexSearcher, OutputWriter, SearchCache |
| `server.js` | Serves the page and a JSON API (`/api/search`, `/api/lines`, `/api/index`, `/api/stats`) |
| `home.html`, `styles.css`, `script.js` | Front end; `script.js` only calls the API and renders the results |
| `data/corpus.json` | Seed lines (description + URL) |
| `data/noise-words.json` | Configurable noise-word list |
| `data/user-lines.json` | Lines added through the page (created on first add) |

## Hosting

The site now needs a Node server, so it cannot be opened as a static file or on GitHub Pages. Any Node host works (Render, Railway, Fly.io): use start command `npm start`, and the host sets `PORT`. On hosts with ephemeral disks, added lines last only until a redeploy.
