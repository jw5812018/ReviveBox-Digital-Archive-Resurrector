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
  await page.getByRole('button', { name: /^Starred \d+$/ }).click()
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

test('dialogs: Esc closes, focus returns to the trigger, one dialog at a time', async ({
  page,
}) => {
  await page.goto('/')

  const addNote = page.getByRole('button', { name: 'Add note' })
  await addNote.click()
  await expect(page.getByRole('dialog', { name: 'Add note' })).toBeVisible()
  await expect(page.getByLabel('Title')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(addNote).toBeFocused()

  // Import used to render a second backdrop and dialog inside the wrapper.
  const importButton = page.getByRole('button', { name: 'Import', exact: true })
  await importButton.click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.locator('.modal-backdrop')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(importButton).toBeFocused()
})

function bigBookmarkFile() {
  const section = (name: string, count: number) =>
    `<DT><H3>${name}</H3>\n<DL><p>\n` +
    Array.from(
      { length: count },
      (_, i) =>
        `<DT><A HREF="https://example.org/${name.toLowerCase()}/${i}" ADD_DATE="1718000000">${name} ${i}</A>`,
    ).join('\n') +
    '\n</DL><p>'
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<DL><p>\n${section('Alpha', 700)}\n${section('Beta', 500)}\n</DL><p>`
  return { name: 'big-bookmarks.html', mimeType: 'text/html', buffer: Buffer.from(html) }
}

test('large bookmark file: import folder by folder, re-import creates nothing', async ({
  page,
}) => {
  await page.goto('/')
  const importButton = page.getByRole('button', { name: 'Import', exact: true })
  const preview = page.locator('.preview-stats')

  await importButton.click()
  await page.locator('input[type="file"]').setInputFiles(bigBookmarkFile())
  await expect(page.getByRole('heading', { name: 'Choose folders to import' })).toBeVisible()
  await expect(page.getByText('big-bookmarks.html has 1,200 bookmarks')).toBeVisible()

  await page.getByRole('checkbox', { name: /^Alpha/ }).check()
  await expect(page.getByText('700 of 1,000 selected')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(preview).toContainText('700 new')
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.getByText('700 new, 0 already in your library.')).toBeVisible()

  await page.getByRole('button', { name: 'Choose more folders' }).click()
  await expect(page.getByText('500 not imported yet.')).toBeVisible()
  await page.getByRole('checkbox', { name: /^Beta/ }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(preview).toContainText('500 new')
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: 'All items 1200' })).toBeVisible()

  // Importing an already imported folder again only finds duplicates.
  await importButton.click()
  await page.locator('input[type="file"]').setInputFiles(bigBookmarkFile())
  await page.getByRole('checkbox', { name: /^Alpha/ }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(preview).toContainText('0 new')
  await expect(preview).toContainText('700 duplicates')
})

test('feeds: add by URL, sample feeds are not fetchable, service failures are shown', async ({
  page,
}) => {
  // The browser never reaches the internet here: fetch calls are fulfilled locally.
  await page.route('**/api/feeds/fetch', async (route) => {
    const { url } = route.request().postDataJSON() as { url: string }
    if (url.includes('rss-a.')) {
      await route.fulfill({ status: 502, contentType: 'text/html', body: '<html>Bad gateway</html>' })
      return
    }
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, code: 'rate-limited', retryAfterSeconds: 600 }),
    })
  })
  await page.goto('/')

  const feedInput = page.getByLabel('Follow a feed')
  const addFeed = page.getByRole('button', { name: 'Add', exact: true })
  await feedInput.fill('http://rss-a.echoshelf-e2e.dev/feed.xml')
  await addFeed.click()
  await expect(page.getByText('Feed addresses must use https.')).toBeVisible()

  await feedInput.fill('https://rss-a.echoshelf-e2e.dev/feed.xml')
  await addFeed.click()
  await expect(page.getByRole('button', { name: 'Refresh rss-a.echoshelf-e2e.dev' })).toBeVisible()
  await feedInput.fill('https://rss-b.echoshelf-e2e.dev/feed.xml')
  await addFeed.click()
  await expect(page.getByRole('button', { name: 'Refresh rss-b.echoshelf-e2e.dev' })).toBeVisible()

  await page.getByRole('button', { name: 'Refresh rss-a.echoshelf-e2e.dev' }).click()
  await expect(
    page.getByText('Network error — The feed service returned an unexpected response (HTTP 502).'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Refresh rss-b.echoshelf-e2e.dev' }).click()
  await expect(
    page.getByText('Rate limited — Too many refreshes from this network. Try again in about 10 min.'),
  ).toBeVisible()

  // Sample OPML feeds on example domains are labelled and have no Refresh button.
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles('public/demo/sample-subscriptions.opml')
  await page.getByRole('button', { name: 'Confirm import' }).click()
  await expect(page.getByText('Sample feed (example domain, not fetchable)')).toHaveCount(3)
  await expect(page.getByRole('button', { name: /^Refresh / })).toHaveCount(2)
})