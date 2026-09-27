// SPDX-License-Identifier: MIT
// Test runner entry point for `npm test`.
//
// Delegates to Playwright: ensures the Chromium browser binary is present
// (no-op when already installed, e.g. locally) and then runs the E2E suite
// with the repo's playwright.config.js, which self-hosts its webServer and
// uses fake camera flags, so the suite runs in plain CI too — ci.yml's
// test step runs this script directly.
import { spawnSync } from 'node:child_process'

const common = { stdio: 'inherit', shell: true }

const install = spawnSync('npx', ['playwright', 'install', 'chromium'], common)
if (install.status !== 0) process.exit(install.status ?? 1)

const test = spawnSync('npx', ['playwright', 'test'], common)
process.exit(test.status ?? 1)
