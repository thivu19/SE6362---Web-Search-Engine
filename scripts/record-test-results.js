"use strict";

// Runs the test suite and writes the actual results to docs/test-results.md.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const run = spawnSync(process.execPath, ["--test", "--test-reporter=spec"], { cwd: root, encoding: "utf8" });
const output = (run.stdout + run.stderr).replace(/\x1b\[[0-9;]*m/g, "").trim();

const md = `# Test Results

Recorded: ${new Date().toISOString()}
Node: ${process.version} · Platform: ${process.platform}
Command: \`npm run test:record\` (runs \`node --test\`)
Exit code: ${run.status} (${run.status === 0 ? "all tests passed" : "FAILURES — see below"})

Test-case IDs (TC-xx) match the test plan in the report.

\`\`\`
${output}
\`\`\`
`;

fs.mkdirSync(path.join(root, "docs"), { recursive: true });
fs.writeFileSync(path.join(root, "docs", "test-results.md"), md);
console.log(output);
process.exit(run.status);
