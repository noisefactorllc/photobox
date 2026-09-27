// SPDX-License-Identifier: MIT
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
    // Retry once in CI: E2E timing is fragile on shared runners (one flake
    // observed there). Retried tests are reported as flaky, not passed, and
    // the run-e2e annotation treats flaky > 0 as a failure verdict.
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI
        ? [['list'], ['json', { outputFile: 'test-results/e2e-report.json' }]]
        : [['list']],
    use: {
        baseURL: 'http://localhost:3005',
        permissions: ['camera'],
        launchOptions: {
            args: [
                '--use-fake-device-for-media-stream',
                '--use-fake-ui-for-media-stream',
            ],
        },
    },
    webServer: {
        command: 'npx http-server public -p 3005 -c-1',
        port: 3005,
        reuseExistingServer: true,
    },
})
