// SPDX-License-Identifier: MIT
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 60000,
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
