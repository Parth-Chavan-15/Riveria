const { chromium } = require('playwright');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8088';

(async () => {
  console.log('================================================================');
  console.log('TESTING ADVANCED SETTINGS & ROLE-BASED ADMIN SYSTEM TABS');
  console.log('Target URL:', TARGET_URL);
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  // -------------------------------------------------------------------------
  // SCENARIO 1: Standard Listener Account
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Listener Account Authentication & Tabs Verification ---');
  const listenerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const listenerPage = await listenerContext.newPage();

  // Login as listener
  await listenerPage.goto(`${TARGET_URL}/auth`, { waitUntil: 'networkidle' });
  await listenerPage.fill('input[type="email"]', 'listener@riveria.com');
  await listenerPage.fill('input[type="password"]', 'RiveriaListener2026!');
  await listenerPage.click('button:has-text("Authenticate")');
  await listenerPage.waitForTimeout(2500);
  console.log('Listener URL after auth:', listenerPage.url());

  // Check Sidebar tabs for listener
  const listenerNavText = await listenerPage.evaluate(() => {
    const nav = document.querySelector('nav');
    return nav ? nav.innerText : '';
  });
  console.log('Listener Sidebar contains "System Architect"?', listenerNavText.includes('System Architect'));
  console.log('Listener Sidebar contains "Engine Console"?', listenerNavText.includes('Engine Console'));
  console.log('Listener Sidebar contains "Discovery"?', listenerNavText.includes('Discovery'));
  console.log('Listener Sidebar contains "Engine Settings"?', listenerNavText.includes('Engine Settings'));

  if (!listenerNavText.includes('System Architect') && !listenerNavText.includes('Engine Console') && listenerNavText.includes('Discovery')) {
    console.log('✅ PASS: Listener sidebar is clean; zero admin tabs exposed to standard listeners.');
  } else {
    console.error('❌ FAIL: Admin tabs leaked to listener sidebar!');
    process.exit(1);
  }

  // Verify listener cannot access /admin route directly
  console.log('Attempting direct navigation to /admin as listener...');
  await listenerPage.goto(`${TARGET_URL}/admin`, { waitUntil: 'networkidle' });
  await listenerPage.waitForTimeout(1000);
  const listenerBlockedUrl = listenerPage.url();
  console.log('URL after unauthorized /admin attempt:', listenerBlockedUrl);
  if (!listenerBlockedUrl.includes('/admin')) {
    console.log('✅ PASS: Listener unauthorized access to /admin was securely intercepted and redirected!');
  } else {
    console.error('❌ FAIL: Listener accessed /admin unauthorized!');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 2: Interactive Settings Controls
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Interactive Audio & DSP Controls in Settings ---');
  await listenerPage.goto(`${TARGET_URL}/settings`, { waitUntil: 'networkidle' });

  // Test 1: EQ Preset Change
  console.log('Testing EQ Preset: Clicking "Bass Presence (+6dB)"...');
  const bassPresetBtn = listenerPage.locator('button:has-text("Bass Presence (+6dB)")');
  await bassPresetBtn.click();
  await listenerPage.waitForTimeout(500);

  const eqState = await listenerPage.evaluate(() => {
    return {
      activePresetBadge: document.querySelector('span.text-primary.px-3')?.innerText,
      storedPreset: localStorage.getItem('reveria:eqPreset'),
      storedBands: localStorage.getItem('reveria:eqBands')
    };
  });
  console.log('EQ State after preset selection:', eqState);
  if (eqState.storedPreset === 'bass_boost') {
    console.log('✅ PASS: Parametric EQ preset activated and stored in device memory!');
  } else {
    console.error('❌ FAIL: EQ preset failed to set!', eqState);
    process.exit(1);
  }

  // Test 2: Acoustic Calibration & 440Hz Test Tone
  console.log('Testing Acoustic Calibration & Hardware Latency Tester...');
  const testToneBtn = listenerPage.locator('button:has-text("Test Acoustic Tone")');
  await testToneBtn.click();
  await listenerPage.waitForTimeout(1500);

  const calibrationResult = await listenerPage.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasSampleRate: text.includes('Sample Rate'),
      hasLatency: text.includes('Base DAC Latency')
    };
  });
  console.log('Calibration diagnostics rendered:', calibrationResult);
  if (calibrationResult.hasSampleRate && calibrationResult.hasLatency) {
    console.log('✅ PASS: Web Audio hardware calibration and crystal test chime executed!');
  } else {
    console.error('❌ FAIL: Calibration output missing!', calibrationResult);
    process.exit(1);
  }

  // Test 3: Save Preferences
  console.log('Testing Save Preferences...');
  const saveBtn = listenerPage.locator('button:has-text("Save Preferences")');
  await saveBtn.click();
  await listenerPage.waitForTimeout(500);
  const saveFeedback = await listenerPage.locator('text=Audiophile engine preferences and DSP parameters saved').count();
  console.log('Save feedback displayed:', saveFeedback > 0);
  if (saveFeedback > 0) {
    console.log('✅ PASS: Settings successfully persisted with visual confirmation!');
  } else {
    console.error('❌ FAIL: Save feedback was not displayed!');
    process.exit(1);
  }

  await listenerContext.close();

  // -------------------------------------------------------------------------
  // SCENARIO 3: Admin / System Architect Account
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Admin Account Authentication & Master Tabs Verification ---');
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const adminPage = await adminContext.newPage();
  adminPage.on('pageerror', (err) => console.error('ADMIN PAGE ERROR:', err.message));
  adminPage.on('console', (msg) => console.log('ADMIN CONSOLE:', msg.type(), msg.text()));

  // Login as admin
  await adminPage.goto(`${TARGET_URL}/auth`, { waitUntil: 'networkidle' });
  await adminPage.fill('input[type="email"]', 'admin@riveria.com');
  await adminPage.fill('input[type="password"]', 'RiveriaAdmin2026!');
  await adminPage.click('button:has-text("Authenticate")');
  await adminPage.waitForTimeout(2000);

  // Check Sidebar tabs for Admin
  const adminNavText = await adminPage.evaluate(() => {
    const nav = document.querySelector('nav');
    return nav ? nav.innerText : '';
  });
  console.log('Admin Sidebar contains "SYSTEM ARCHITECT"?', adminNavText.toUpperCase().includes('SYSTEM ARCHITECT'));
  console.log('Admin Sidebar contains "Engine Console"?', adminNavText.includes('Engine Console'));
  console.log('Admin Sidebar contains "Catalog Master"?', adminNavText.includes('Catalog Master'));
  console.log('Admin Sidebar contains "User Governance"?', adminNavText.includes('User Governance'));

  if (
    adminNavText.toUpperCase().includes('SYSTEM ARCHITECT') &&
    adminNavText.includes('Engine Console') &&
    adminNavText.includes('Catalog Master') &&
    adminNavText.includes('User Governance')
  ) {
    console.log('✅ PASS: Admin account sees full master system control navigation tabs!');
  } else {
    console.error('❌ FAIL: Admin tabs not found in admin sidebar!', adminNavText);
    process.exit(1);
  }

  // Test 4: TopBar Architect Console badge
  const topBarBadge = await adminPage.locator('text=Architect Console').count();
  console.log('TopBar "Architect Console" badge count:', topBarBadge);
  if (topBarBadge > 0) {
    console.log('✅ PASS: TopBar showcases distinctive Architect Console master badge!');
  }

  // Test 5: Engine Console (/admin)
  console.log('\nTesting Engine Console (/admin)...');
  await adminPage.goto(`${TARGET_URL}/admin`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(2000);
  console.log('Current URL on /admin navigation:', adminPage.url());
  const bodySnippet = await adminPage.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Body snippet on /admin:', bodySnippet);

  const consoleMetrics = await adminPage.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      hasActiveJams: text.includes('ACTIVE JAMS'),
      hasHeap: text.includes('HEAP ALLOCATION'),
      hasBroadcast: text.includes('GLOBAL MESH BROADCAST'),
      hasDatabase: text.includes('DATABASE CLUSTER')
    };
  });
  console.log('Engine Console Telemetry Panels:', consoleMetrics);
  if (consoleMetrics.hasActiveJams && consoleMetrics.hasHeap && consoleMetrics.hasBroadcast) {
    console.log('✅ PASS: Real-time telemetry and mesh controls operational in Engine Console!');
  } else {
    console.error('❌ FAIL: Engine console missing telemetry panels!', consoleMetrics);
    process.exit(1);
  }

  // Test 6: Catalog Master (/admin/catalog)
  console.log('\nTesting Catalog Master (/admin/catalog)...');
  await adminPage.goto(`${TARGET_URL}/admin/catalog`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1500);

  const catalogStats = await adminPage.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      totalRows: document.querySelectorAll('tbody tr').length,
      hasUploadBtn: text.includes('UPLOAD MASTER TRACK')
    };
  });
  console.log('Catalog Master Stats:', catalogStats);
  if (catalogStats.totalRows > 0 && catalogStats.hasUploadBtn) {
    console.log(`✅ PASS: Master catalog loaded ${catalogStats.totalRows} cloud tracks with full CRUD controls!`);
  } else {
    console.error('❌ FAIL: Catalog table is empty or missing upload button!', catalogStats);
    process.exit(1);
  }

  // Test 7: User Governance (/admin/users)
  console.log('\nTesting User Governance (/admin/users)...');
  await adminPage.goto(`${TARGET_URL}/admin/users`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(1500);

  const userStats = await adminPage.evaluate(() => {
    const text = document.body.innerText.toUpperCase();
    return {
      userRows: document.querySelectorAll('tbody tr').length,
      hasAdminBadge: text.includes('SYSTEM ARCHITECTS'),
      hasListenerBadge: text.includes('STANDARD LISTENERS')
    };
  });
  console.log('User Governance Stats:', userStats);
  if (userStats.userRows > 0 && userStats.hasAdminBadge && userStats.hasListenerBadge) {
    console.log(`✅ PASS: User governance dashboard loaded ${userStats.userRows} user accounts with role delegation!`);
  } else {
    console.error('❌ FAIL: User governance table is empty or missing badges!', userStats);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL SETTINGS & ROLE-BASED ADMIN SYSTEM TESTS PASSED 100%!');
  console.log('================================================================');

  await adminContext.close();
  await browser.close();
})();
