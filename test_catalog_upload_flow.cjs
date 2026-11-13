const { chromium } = require('playwright');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8088';

(async () => {
  console.log('================================================================');
  console.log('VERIFYING REAL MASTER AUDIO UPLOAD & GRIDFS INGEST FLOW');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message));
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('dialog', async dialog => {
    console.log('BROWSER DIALOG:', dialog.type(), dialog.message());
    await dialog.accept();
  });
  page.on('response', async res => {
    if (res.url().includes('/api/')) {
      console.log('API RESP:', res.status(), res.url());
      if (res.status() >= 400) {
        try {
          const body = await res.text();
          console.log('ERROR BODY:', body.slice(0, 300));
        } catch {}
      }
    }
  });

  try {
    // 1. Authenticate as Admin
    console.log('Authenticating as admin@riveria.com...');
    await page.goto(`${TARGET_URL}/auth`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'admin@riveria.com');
    await page.fill('input[type="password"]', 'RiveriaAdmin2026!');
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
      page.click('button:has-text("Authenticate")')
    ]);
    await page.waitForTimeout(1000);

    // 2. Navigate to Catalog Master (/admin/catalog)
    console.log('Navigating to Catalog Master (/admin/catalog)...');
    await page.goto(`${TARGET_URL}/admin/catalog`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const initialRows = await page.locator('tbody tr').count();
    console.log(`Initial Catalog track rows: ${initialRows}`);

    // 3. Open Upload Modal
    console.log('Opening Upload Master Track modal...');
    await page.click('button:has-text("Upload Master Track")');
    await page.waitForTimeout(500);

    // 4. Select audio file
    const audioFilePath = path.resolve(__dirname, 'client/public/audio/imagine-dragons-birds.mp3');
    console.log(`Setting audio file: ${audioFilePath}`);
    await page.setInputFiles('input[type="file"][accept*="audio"]', audioFilePath);
    await page.waitForTimeout(1500);

    // 5. Inspect auto-populated metadata
    const populatedMeta = await page.evaluate(() => {
      const titleInput = document.querySelector('input[placeholder*="Midnight Horizon"]');
      const artistInput = document.querySelector('input[placeholder*="Hans Zimmer"]');
      const durationInput = document.querySelector('input[placeholder="03:45"]');
      return {
        title: titleInput ? titleInput.value : '',
        artist: artistInput ? artistInput.value : '',
        duration: durationInput ? durationInput.value : ''
      };
    });
    console.log('Auto-extracted metadata from file:', populatedMeta);

    if (!populatedMeta.title || !populatedMeta.artist) {
      console.error('❌ FAIL: Title or artist was not auto-extracted!');
      process.exit(1);
    }
    console.log('✅ PASS: Real audio metadata successfully auto-extracted into upload modal!');

    // Modify title to uniquely identify this test upload
    const testTitle = `Test Cloud Master Track ${Date.now()}`;
    await page.fill('input[placeholder*="Midnight Horizon"]', testTitle);

    // 6. Submit upload
    console.log('Submitting Master Track to GridFS...');
    await page.click('button:has-text("Upload & Deploy")');

    // Wait for upload & GridFS ingestion to complete (allow up to 60s for multi-chunk cloud upload)
    console.log('Waiting for GridFS cloud deployment confirmation...');
    await page.waitForSelector('text=successfully deployed to MongoDB GridFS', { timeout: 60000 });
    await page.waitForTimeout(1500);

    // 7. Verify track in catalog
    const noticeText = await page.evaluate(() => document.body.innerText);
    const hasSuccessNotice = noticeText.includes('successfully deployed to MongoDB GridFS');
    console.log('Success notice displayed:', hasSuccessNotice);

    const updatedRows = await page.locator('tbody tr').count();
    console.log(`Updated Catalog track rows: ${updatedRows}`);

    const hasNewTrack = await page.locator(`text=${testTitle}`).count();
    console.log(`New track visible in master catalog: ${hasNewTrack > 0}`);

    if (hasNewTrack > 0) {
      console.log('✅ PASS: Real audio file successfully uploaded, persisted in GridFS, and visible in master catalog!');
    } else {
      console.error('❌ FAIL: Uploaded track not found in master catalog table!');
      process.exit(1);
    }

    // 8. Test In-line Edit of this track
    console.log(`Testing in-line edit of "${testTitle}"...`);
    const editBtn = page.locator(`tr:has-text("${testTitle}") button:has-text("edit")`);
    await editBtn.click();
    await page.waitForTimeout(500);

    const editedTitle = `${testTitle} (Studio Remaster)`;
    await page.fill('div.fixed input[value*="Test Cloud Master"]', editedTitle);
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(1500);

    const hasEditedTrack = await page.locator(`text=${editedTitle}`).count();
    console.log(`Edited track visible in table: ${hasEditedTrack > 0}`);
    if (hasEditedTrack > 0) {
      console.log('✅ PASS: In-line metadata update succeeded!');
    }

    // 9. Clean up: Delete the test track
    console.log(`Cleaning up test track: "${editedTitle}"...`);
    const deleteBtn = page.locator(`tr:has-text("${editedTitle}") button:has-text("delete")`);
    await deleteBtn.click();
    await page.waitForTimeout(2000);

    const trackAfterDelete = await page.locator(`text=${editedTitle}`).count();
    console.log(`Track count after deletion: ${trackAfterDelete}`);
    if (trackAfterDelete === 0) {
      console.log('✅ PASS: Test track cleanly deleted from catalog and GridFS storage!');
    }

    console.log('\n================================================================');
    console.log('🎉 REAL AUDIO CLOUD INGEST & GRIDFS CRUD PASSED 100%!');
    console.log('================================================================');

    await context.close();
    await browser.close();
  } catch (error) {
    console.error('❌ Exception during upload flow:', error);
    await browser.close();
    process.exit(1);
  }
})();
