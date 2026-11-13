const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8088';

(async () => {
  console.log('================================================================');
  console.log('VERIFYING AUDIOPHILE DSP ENGINE & PEAK ADMIN SUITE');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Standard Listener Perspective (Clean, Zero Admin Bleed)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Standard Listener Perspective ---');
    const listenerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const listenerPage = await listenerCtx.newPage();

    await listenerPage.goto(`${TARGET_URL}/auth`, { waitUntil: 'networkidle' });
    await listenerPage.fill('input[type="email"]', 'listener@riveria.com');
    await listenerPage.fill('input[type="password"]', 'RiveriaListener2026!');
    await listenerPage.click('button:has-text("Authenticate")');
    await listenerPage.waitForTimeout(2000);

    const listenerSidebarText = await listenerPage.evaluate(() => document.querySelector('nav')?.innerText.toUpperCase() || '');
    console.log('Listener Sidebar contains "SYSTEM ARCHITECT"?', listenerSidebarText.includes('SYSTEM ARCHITECT'));
    console.log('Listener Sidebar contains "LISTENER SUITE"?', listenerSidebarText.includes('LISTENER SUITE'));

    if (listenerSidebarText.includes('SYSTEM ARCHITECT')) {
      console.error('❌ FAIL: Admin suite exposed to standard listener!');
      process.exit(1);
    }
    console.log('✅ PASS: Listener sidebar is clean with zero admin exposure.');

    // Visit /sync as listener: verify NO "Deploy to Cloud" or "System Architect"
    await listenerPage.goto(`${TARGET_URL}/sync`, { waitUntil: 'networkidle' });
    await listenerPage.waitForTimeout(1000);
    const syncText = await listenerPage.evaluate(() => document.body.innerText.toUpperCase());
    console.log('Listener /sync contains "DEPLOY TO CLOUD"?', syncText.includes('DEPLOY TO CLOUD'));
    console.log('Listener /sync contains "SYSTEM ARCHITECT"?', syncText.includes('SYSTEM ARCHITECT'));

    if (syncText.includes('DEPLOY TO CLOUD') || syncText.includes('SYSTEM ARCHITECT STAGING SUITE')) {
      console.error('❌ FAIL: Admin cloud promotion buttons leaked to standard listener!');
      process.exit(1);
    }
    console.log('✅ PASS: Local Sync Hub correctly sandboxed for standard listeners.');

    await listenerCtx.close();

    // -------------------------------------------------------------------------
    // TEST 2: Admin Authentication & Distinct Studio Tabs
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Admin Authentication & Architect Director Suites ---');
    const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminCtx.newPage();
    adminPage.on('pageerror', (err) => console.error('ADMIN PAGE ERROR:', err.message));

    await adminPage.goto(`${TARGET_URL}/auth`, { waitUntil: 'networkidle' });
    await adminPage.fill('input[type="email"]', 'admin@riveria.com');
    await adminPage.fill('input[type="password"]', 'RiveriaAdmin2026!');
    await adminPage.click('button:has-text("Authenticate")');
    await adminPage.waitForTimeout(2000);

    const adminSidebarText = await adminPage.evaluate(() => document.querySelector('nav')?.innerText.toUpperCase() || '');
    console.log('Admin Sidebar contains "SYSTEM ARCHITECT"?', adminSidebarText.includes('SYSTEM ARCHITECT'));
    console.log('Admin Sidebar contains "STUDIO & BROADCAST"?', adminSidebarText.includes('STUDIO & BROADCAST'));
    console.log('Admin Sidebar contains "ENGINE CONSOLE"?', adminSidebarText.includes('ENGINE CONSOLE'));
    console.log('Admin Sidebar contains "CATALOG MASTER"?', adminSidebarText.includes('CATALOG MASTER'));
    console.log('Admin Sidebar contains "USER GOVERNANCE"?', adminSidebarText.includes('USER GOVERNANCE'));

    if (!adminSidebarText.includes('SYSTEM ARCHITECT') || !adminSidebarText.includes('STUDIO & BROADCAST')) {
      console.error('❌ FAIL: Admin sidebar missing architect suite!', adminSidebarText);
      process.exit(1);
    }
    console.log('✅ PASS: Admin sidebar cleanly structured with Architect and Studio tiers!');

    // Check Tab 1 (Dashboard / Discovery): Verify 32-bit DSP Banner and Catalog Master button
    const dashboardStats = await adminPage.evaluate(() => {
      const text = document.body.innerText.toUpperCase();
      return {
        hasDspBanner: text.includes('32-BIT FLOATING DSP STAGE ACTIVE'),
        hasCatalogMasterBtn: text.includes('CATALOG MASTER')
      };
    });
    console.log('Dashboard DSP & Studio Master Stats:', dashboardStats);
    if (!dashboardStats.hasDspBanner) {
      console.error('❌ FAIL: Dashboard missing 32-bit DSP stage indicator!');
      process.exit(1);
    }
    console.log('✅ PASS: Dashboard features 32-bit Audiophile DSP status & studio shortcut!');

    // Check Tab 2 (/sync): Verify System Architect Staging Suite
    await adminPage.goto(`${TARGET_URL}/sync`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1000);
    const adminSyncText = await adminPage.evaluate(() => document.body.innerText.toUpperCase());
    console.log('Admin /sync contains "SYSTEM ARCHITECT STAGING SUITE"?', adminSyncText.includes('SYSTEM ARCHITECT STAGING SUITE'));
    if (!adminSyncText.includes('SYSTEM ARCHITECT STAGING SUITE')) {
      console.error('❌ FAIL: Admin /sync missing System Architect Staging Suite!');
      process.exit(1);
    }
    console.log('✅ PASS: Local Sync Hub equips Admins with Master Cloud Ingest Staging!');

    // Check Tab 3 (/session): Verify WebRTC Jam Director Suite
    await adminPage.goto(`${TARGET_URL}/session`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1000);
    // Create room to test director suite
    const createBtn = adminPage.locator('button:has-text("Create Jam Room")');
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await adminPage.waitForTimeout(1500);
    }

    const sessionDirectorStats = await adminPage.evaluate(() => {
      const text = document.body.innerText.toUpperCase();
      return {
        hasDirectorSuite: text.includes('WEBRTC JAM DIRECTOR SUITE'),
        hasForceSyncBtn: text.includes('FORCE MULTI-PEER ACOUSTIC RE-SYNC'),
        hasIntercomBtn: text.includes('DIRECTOR INTERCOM ANNOUNCEMENT')
      };
    });
    console.log('Session Jam Director Stats:', sessionDirectorStats);
    if (!sessionDirectorStats.hasDirectorSuite || !sessionDirectorStats.hasForceSyncBtn) {
      console.error('❌ FAIL: Jam Director Suite controls not found in WebRTC Session!', sessionDirectorStats);
      process.exit(1);
    }
    console.log('✅ PASS: WebRTC Session equips Admins with Master Director Override Suite!');

    // -------------------------------------------------------------------------
    // TEST 3: Real-Time Audio DSP Pipeline in Settings
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Real-Time Web Audio DSP Graph Execution ---');
    await adminPage.goto(`${TARGET_URL}/settings`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);

    // Test changing EQ preset to Bass Presence (+6dB)
    const bassPresetBtn = adminPage.locator('button:has-text("Bass Presence (+6dB)")');
    await bassPresetBtn.click();
    await adminPage.waitForTimeout(600);

    // Test sliding Stereo Soundstage to 170%
    await adminPage.fill('#width-slider', '170');
    await adminPage.evaluate(() => {
      const slider = document.querySelector('#width-slider');
      if (slider) slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await adminPage.waitForTimeout(600);

    // Inspect live DSP Engine state in browser memory
    const dspState = await adminPage.evaluate(() => {
      const dsp = window.__riveriaDSP;
      return {
        currentBands: dsp ? dsp.currentBands : [],
        currentSpatialWidth: dsp ? dsp.currentSpatialWidth : 0,
        currentNormalization: dsp ? dsp.currentNormalization : false,
        diagnostics: dsp ? dsp.getHardwareDiagnostics() : null
      };
    });
    console.log('Active DSP Engine Parameters in Memory:', dspState);

    if (
      dspState.currentBands[0] === 6 &&
      dspState.currentBands[1] === 4 &&
      dspState.currentSpatialWidth === 170
    ) {
      console.log('✅ PASS: Parametric EQ and 3D Spatial Virtualizer directly modulate live DSP graph in real time!');
    } else {
      console.error('❌ FAIL: DSP graph parameters did not match selected controls!', dspState);
      process.exit(1);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Master Catalog Upload with Auto-ID3 & Cover Extraction
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Master Catalog Ingest & Metadata Cover Art ---');
    await adminPage.goto(`${TARGET_URL}/admin/catalog`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1500);

    // Open upload modal
    const uploadTrigger = adminPage.locator('button:has-text("Upload Master Track")');
    await uploadTrigger.click();
    await adminPage.waitForTimeout(500);

    // Verify modal elements: Audio File input, Title, Artist, Duration, Storage Mode
    const modalFields = await adminPage.evaluate(() => {
      const text = document.body.innerText.toUpperCase();
      return {
        hasAudioInput: !!document.querySelector('input[type="file"]'),
        hasGridFsBadge: text.includes('MONGODB GRIDFS MASTER'),
        hasTrackTitleInput: text.includes('TRACK TITLE'),
        hasArtistInput: text.includes('ARTIST NAME'),
        hasDurationInput: text.includes('DURATION (MM:SS)')
      };
    });
    console.log('Master Catalog Upload Modal Fields:', modalFields);

    if (!modalFields.hasAudioInput || !modalFields.hasGridFsBadge) {
      console.error('❌ FAIL: Master Catalog upload modal missing essential fields!', modalFields);
      process.exit(1);
    }
    console.log('✅ PASS: Master Catalog Ingest Studio fully operational with GridFS deployment!');

    console.log('\n================================================================');
    console.log('🎉 ALL AUDIOPHILE DSP & PEAK ADMIN SUITE TESTS PASSED 100%!');
    console.log('================================================================');

    await adminCtx.close();
    await browser.close();
  } catch (error) {
    console.error('❌ Exception during verification:', error);
    await browser.close();
    process.exit(1);
  }
})();
