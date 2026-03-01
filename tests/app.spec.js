import { test, expect } from '@playwright/test'

test.describe('Photobomb', () => {
    test('loads and shows grid view', async ({ page, context }) => {
        // Grant camera permission with fake device
        await context.grantPermissions(['camera'])

        await page.goto('/')
        await expect(page.locator('#title-bar')).toContainText('PHOTOBOMB')
        await expect(page.locator('.grid-container')).toBeVisible()
        await expect(page.locator('.grid-tile')).toHaveCount(9)
        await expect(page.locator('.tab-btn')).toHaveCount(2)
    })

    test('switches tabs', async ({ page, context }) => {
        await context.grantPermissions(['camera'])
        await page.goto('/')

        const distortionsTab = page.locator('.tab-btn', { hasText: 'Distortions' })
        await distortionsTab.click()
        await expect(distortionsTab).toHaveClass(/active/)
    })
})
