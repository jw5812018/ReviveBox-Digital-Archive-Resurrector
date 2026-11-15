import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Critical browser path (guide section 10, check 9):
 * enter demo → import file → see dedupe results → search → star →
 * reload and verify persistence → export.
 */
test('demo flow: import, dedupe preview, search, star, reload, export', async ({
  page,
}) => {
  await page.goto('/')

  // First run: dashboard with the two entries.
  await expect(page.getByRole('heading', { name: 'EchoShelf' })).toBeVisible()
  await page.locator('.dashboard-actions').getByRole('button', { name: 'Try the demo' }).click()

  // Demo library: 50 items, banner with honest sample notice.
  await expect(page.getByText('Sample data generated for this demo')).toBeVisible()
  await expect(page.locator('.item-row')).toHaveCount(50)

  // Import the sample bookmark file.
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page
    .locator('input[type="file"]')
    .setInputFiles('public/demo/sample-bookmarks.html')

  // Preview: 4 new, 3 duplicates (utm/fbclid variants), 1 invalid (javascript:).
  const stats = page.locator('.preview-stats')
  await expect(stats).toContainText('4 new')
  await expect(stats).toContainText('3 duplicates')
  await expect(stats).toContainText('1 invalid')
  await expect(page.locator('.preview-invalid')).toHaveCount(1)

  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.locator('.item-row')).toHaveCount(54)

  // Search matches the tutorial's URL uniquely.
  await page.getByRole('searchbox', { name: 'Search items' }).fill('indexeddb-zh')
  await expect(page.locator('.item-row')).toHaveCount(1)

  // Open detail and star the item (demo already has 10 starred).
  await page.locator('.item-row').first().click()
  await expect(page.getByRole('region', { name: 'Item details' })).toBeVisible()
  await page.getByRole('button', { name: 'Star', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Starred 11' })).toBeVisible()

  // Reload: demo mode and the star persist.
  await page.reload()
  await page.getByRole('button', { name: 'Starred' }).click()
  await expect(page.locator('.item-row')).toHaveCount(11)

  // Export produces a valid v1 backup with all data.
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export data' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const backup = JSON.parse(readFileSync(path, 'utf8'))
  expect(backup.schemaVersion).toBe('1')
  expect(backup.items).toHaveLength(54)
  expect(backup.sources.length).toBeGreaterThan(0)
})

test('personal flow: add bookmark, persists across reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'EchoShelf' })).toBeVisible()

  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByLabel('Title').fill('My first bookmark')
  await page.getByLabel('URL').fill('https://example.org/my-article')
  await page.getByRole('button', { name: 'Save bookmark' }).click()

  await expect(page.locator('.item-row')).toHaveCount(1)

  await page.reload()
  await expect(page.locator('.item-row')).toHaveCount(1)
  await expect(page.locator('.item-row').first()).toContainText('My first bookmark')
})

test('demo reset does not touch the personal library', async ({ page }) => {
  await page.goto('/')

  // Personal: add a note.
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByLabel('Title').fill('Personal note')
  await page.getByRole('textbox', { name: 'Note' }).fill('private content')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.item-row')).toHaveCount(1)

  // The demo entry stays available from the sidebar in personal mode.
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.locator('.item-row')).toHaveCount(50)

  // Reset demo, then switch back: personal note is untouched.
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.locator('.item-row')).toHaveCount(50)
  await page.getByRole('button', { name: 'Back to personal' }).click()
  await expect(page.locator('.item-row')).toHaveCount(1)
  await expect(page.locator('.item-row').first()).toContainText('Personal note')
})