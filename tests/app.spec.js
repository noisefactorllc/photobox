// SPDX-License-Identifier: MIT
import { test, expect } from '@playwright/test'

// Simulate a horizontal touch swipe on the full-size canvas wrapper.
// Synthetic TouchEvents drive the app's own swipe handler; Chromium provides
// the Touch/TouchEvent constructors regardless of the hasTouch context option.
async function swipe(page, fromX, fromY, toX, toY) {
    await page.evaluate(([fx, fy, tx, ty]) => {
        const el = document.querySelector('.fullsize-canvas-wrapper')
        const touch = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y })
        const init = (x, y) => ({
            bubbles: true, cancelable: true,
            touches: [touch(x, y)], changedTouches: [touch(x, y)],
        })
        el.dispatchEvent(new TouchEvent('touchstart', init(fx, fy)))
        el.dispatchEvent(new TouchEvent('touchend', init(tx, ty)))
    }, [fromX, fromY, toX, toY])
}

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

// Enter full-size view and wait for the full-size renderer to be visible.
async function enterFullsize(page, tileIndex) {
    await page.locator('.grid-tile').nth(tileIndex).click()
    await expect(page.locator('#fullsize-view')).toBeVisible()
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

    test('records video, stops cleanly, and saves the capture', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)

        await page.locator('.grid-tile').first().click()
        await expect(page.locator('#fullsize-view')).toBeVisible()

        await page.locator('.mode-btn[data-mode="video"]').click()
        // Intercept captureStream so we can assert the recording's tracks are
        // released when recording stops (each call returns a fresh stream).
        await page.evaluate(() => {
            const orig = HTMLCanvasElement.prototype.captureStream
            window.__capturedStreams = []
            HTMLCanvasElement.prototype.captureStream = function (...args) {
                const stream = orig.apply(this, args)
                window.__capturedStreams.push(stream)
                return stream
            }
        })
        const downloadPromise = page.waitForEvent('download')

        // The continuous software-WebGL rendering starves Playwright's
        // actionability/stability polling, so drive the shutter directly
        // instead of waiting for click-through stability checks.
        await page.locator('#shutter-btn').dispatchEvent('click')
        await expect.poll(() =>
            page.evaluate(() =>
                !document.getElementById('recording-status').classList.contains('hidden') &&
                document.getElementById('shutter-btn').classList.contains('recording')
            ), { timeout: 10000 }).toBe(true)

        await page.locator('#shutter-btn').dispatchEvent('click')
        await expect.poll(() =>
            page.evaluate(() =>
                document.getElementById('recording-status').classList.contains('hidden') &&
                !document.getElementById('shutter-btn').classList.contains('recording') &&
                document.getElementById('recording-timer').textContent === '0:00'
            ), { timeout: 10000 }).toBe(true)

        // The recording's captureStream tracks must be released on stop.
        const liveTracks = await page.evaluate(() =>
            window.__capturedStreams.reduce((n, s) =>
                n + s.getVideoTracks().filter(t => t.readyState === 'live').length, 0))
        expect(liveTracks).toBe(0)

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/^photobox-\d+\.webm$/)
        await expect(page.locator('.filmstrip-item')).toHaveCount(1)
    })

    test('cancels photo capture when leaving full-size during the countdown', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)

        await enterFullsize(page, 0)

        // Start a photo capture (3s countdown), then back out of full-size
        // view while it is still counting down.
        await page.locator('#shutter-btn').dispatchEvent('click')
        await expect(page.locator('.countdown-overlay')).toHaveCount(1)

        const downloads = []
        page.on('download', d => downloads.push(d))

        await page.locator('#grid-back-btn').dispatchEvent('click')
        await expect(page.locator('#grid-view')).toBeVisible()

        // The countdown must be torn down immediately, not keep ticking
        // over the grid view, flash, and capture a stale frame.
        await expect(page.locator('.countdown-overlay')).toHaveCount(0, { timeout: 1000 })

        // Wait past the countdown+flash window: nothing may be captured,
        // saved to the filmstrip, or auto-downloaded.
        await page.waitForTimeout(4500)
        await expect(page.locator('.filmstrip-item')).toHaveCount(0)
        expect(downloads).toEqual([])
    })

    test('captures a photo from full-size view', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)

        await enterFullsize(page, 0)

        // Match the video test's default-timing window: software-WebGL
        // rendering can slow the countdown + toBlob path on cold runners.
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
        await page.locator('#shutter-btn').dispatchEvent('click')

        // The countdown runs to completion in full-size view.
        await expect(page.locator('.countdown-overlay')).toHaveCount(1)
        await expect(page.locator('.countdown-overlay')).toHaveCount(0, { timeout: 10000 })

        const download = await downloadPromise
        expect(download.suggestedFilename()).toMatch(/^photobox-\d+\.png$/)
        await expect(page.locator('.filmstrip-item')).toHaveCount(1)
    })

    test('cycles to the adjacent effect when entering from the Normal tile', async ({ page, context }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await context.grantPermissions(['camera'])
        await gotoReady(page)

        // Enter full-size view from the center tile (Normal).
        await page.locator('.grid-tile').nth(4).click()
        await expect(page.locator('#fullsize-view')).toBeVisible()
        await expect(page.locator('#effect-name')).toHaveText('Normal')

        // Swipe left (next effect): Normal's right-hand neighbor in grid
        // order is Bloom — not the first effect of the tab.
        await swipe(page, 640, 300, 140, 300)
        await expect(page.locator('#effect-name')).toHaveText('Bloom', { timeout: 10000 })

        // Swipe right (previous effect): from Bloom that is Noir.
        await swipe(page, 140, 300, 640, 300)
        await expect(page.locator('#effect-name')).toHaveText('Noir', { timeout: 10000 })
    })
})
