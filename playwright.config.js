import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:3005',
        permissions: ['camera'],
    },
    webServer: {
        command: 'npx http-server public -p 3005 -c-1',
        port: 3005,
        reuseExistingServer: true,
    },
})
