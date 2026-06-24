import { test, expect } from '@playwright/test'

test.describe('UBTC Wallet Flow', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/UBTC|World Local Bank/)
  })

  test('navigate to vault creation', async ({ page }) => {
    await page.goto('/vault')
    await expect(page.locator('text=Choose your account type')).toBeVisible({ timeout: 10000 })
  })

  test('current account is selectable', async ({ page }) => {
    await page.goto('/vault')
    await page.waitForTimeout(2000)
    const currentCard = page.locator('text=Standard Account').first()
    await expect(currentCard).toBeVisible()
    await currentCard.click()
  })

  test('savings account shows coming soon', async ({ page }) => {
    await page.goto('/vault')
    await page.waitForTimeout(2000)
    await expect(page.locator('text=COMING SOON').first()).toBeVisible()
  })

  test('wallet page loads', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('full account creation flow', async ({ page }) => {
    await page.goto('/vault')
    await page.waitForTimeout(3000)

    // Select Current Account
    const currentAccount = page.locator('text=Standard Account').first()
    await currentAccount.click()
    await page.waitForTimeout(500)

    // Look for continue/next button
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Open")')
    if (await continueBtn.count() > 0) {
      await continueBtn.first().click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/after-continue.png' })
    }
  })
})

test.describe('QuFi Dashboard', () => {
  test('node dashboard loads', async ({ page }) => {
    await page.goto('http://localhost:9090')
    await page.waitForTimeout(2000)
    await expect(page.locator('text=QuFi Foundation')).toBeVisible()
    await expect(page.locator('text=Online')).toBeVisible()
  })

  test('run verification test', async ({ page }) => {
    await page.goto('http://localhost:9090')
    await page.waitForTimeout(2000)
    const testBtn = page.locator('button:has-text("Run PQ Signature Test")')
    await testBtn.click()
    await page.waitForTimeout(3000)
    await expect(page.locator('text=FAIL')).toBeVisible()
    await page.screenshot({ path: 'tests/screenshots/qufi-test-result.png' })
  })

  test('shows network nodes', async ({ page }) => {
    await page.goto('http://localhost:9090')
    await page.waitForTimeout(3000)
    await expect(page.locator('text=qufi-alpha')).toBeVisible()
  })
})
