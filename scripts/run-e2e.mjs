// SPDX-License-Identifier: MIT
// Test runner entry point for `npm test`.
//
// Delegates to Playwright: ensures the Chromium browser binary is present
// (no-op when already installed, e.g. locally) and then runs the E2E suite
// with the repo's playwright.config.js, which self-hosts its webServer and
// uses fake camera flags, so the suite runs in plain CI too — ci.yml's
// test step runs this script directly.
//
// ci.yml's test step is continue-on-error, so this script makes the verdict
// independently auditable: after every run it reads the suite's pass/fail
// stats from Playwright's JSON reporter and emits them as a check-run
// annotation (::notice on pass, ::error on fail) plus the GitHub step
// summary — both fetchable from the checks API even though the job
// conclusion would mask a failure. The report is read BEFORE honoring
// Playwright's exit code, so a failing run is still recorded.
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, appendFileSync } from 'node:fs'

const common = { stdio: 'inherit', shell: true }

const install = spawnSync('npx', ['playwright', 'install', 'chromium'], common)
if (install.status !== 0) process.exit(install.status ?? 1)

const test = spawnSync('npx', ['playwright', 'test'], common)
const testStatus = test.status ?? 1

// Playwright writes the JSON report even when the suite fails, so parse it
// before acting on the exit code.
const reportPath = 'test-results/e2e-report.json'
let stats = null
if (existsSync(reportPath)) {
    try {
        stats = JSON.parse(readFileSync(reportPath, 'utf8')).stats
    } catch (err) {
        console.error(`[E2E] Could not parse ${reportPath}: ${err.message}`)
    }
} else {
    console.error('[E2E] No JSON report — suite outcome unrecorded')
}

if (stats) {
    const verdict =
        `${stats.expected ?? 0} passed, ${stats.unexpected ?? 0} failed, ` +
        `${stats.flaky ?? 0} flaky, ${stats.skipped ?? 0} skipped` +
        (testStatus !== 0 ? ` (runner exit ${testStatus})` : '')
    console.log(`[E2E] Suite verdict: ${verdict}`)

    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(
            process.env.GITHUB_STEP_SUMMARY,
            `## E2E suite\n\n| expected | unexpected | flaky | skipped |\n|---|---|---|---|\n` +
            `| ${stats.expected ?? 0} | ${stats.unexpected ?? 0} | ${stats.flaky ?? 0} | ${stats.skipped ?? 0} |\n`
        )
    }

    const failed = (stats.unexpected ?? 0) > 0 || (stats.flaky ?? 0) > 0 || testStatus !== 0
    console.log(`::${failed ? 'error' : 'notice'} title=Photobox E2E suite verdict::${verdict}`)
}

process.exit(testStatus)
