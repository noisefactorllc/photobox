// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test'

// Navigate and wait for the app to finish initializing. Cold start builds ~10
// WebGL contexts and downloads the shader bundle, which can exceed Playwright's
// default 5s assertion window on the first load in a browser process. The tile
// elements are created synchronously, so they are not a readiness signal; the
// tab bar is built only after every grid renderer finishes initializing, so wait
// for it (under the generous timeout) to keep the slow cold-start work covered.
async function gotoReady(page) {
    await page.goto('/')
    await expect(page.locator('.grid-tile')).toHaveCount(9, { timeout: 20000 })
    await expect(page.locator('.tab-btn')).toHaveCount(2, { timeout: 20000 })
}

test.describe('Photobox', () => {
    test('loads and shows grid view', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])

        await gotoReady(page)
        await expect(page.locator('.grid-container')).toBeVisible()
        await expect(page.locator('.grid-tile')).toHaveCount(9)
        await expect(page.locator('.tab-btn')).toHaveCount(2)
    })

    test('switches tabs', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)

        const distortionsTab = page.locator('.tab-btn', { hasText: 'Distortions' })
        await distortionsTab.click()
        await expect(distortionsTab).toHaveClass(/active/)
    })

    test('hides Normal tile on mobile viewport', async ({ page, context }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)
        await expect(page.locator('.grid-tile')).toHaveCount(9)
        await expect(page.locator('.grid-tile').nth(4)).toBeHidden()
    })

    test('hides Normal tile after resizing to mobile', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)
        await expect(page.locator('.grid-tile').nth(4)).toBeVisible()
        await page.setViewportSize({ width: 390, height: 844 })
        await expect(page.locator('.grid-tile').nth(4)).toBeHidden()
    })
})
