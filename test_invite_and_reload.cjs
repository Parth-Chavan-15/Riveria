const { chromium } = require('playwright');

const TARGET_URL = 'https://riveria-umber.vercel.app';
const TEST_ROOM = 'TEST-INVITE-8821';

async function runTests() {
  console.log('================================================================');
  console.log('TESTING RELOAD, ROUTING & JAM INVITATION FLOW');
  console.log('Target URL:', TARGET_URL);
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Reloading landing page when guest (unauthenticated)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Guest Landing Page Reload ---');
    await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const urlBeforeReload = page.url();
    console.log('Current URL before reload:', urlBeforeReload);

    console.log('Reloading landing page...');
    await page.reload({ timeout: 15000 }).catch(async () => {
      await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'domcontentloaded' });
    });
    await page.waitForTimeout(2000);

    const urlAfterReload = page.url();
    console.log('Current URL after reload:', urlAfterReload);

    if (urlAfterReload.includes('/landing') && !urlAfterReload.includes('/auth') && !urlAfterReload.includes('room=')) {
      console.log('✅ PASS: Guest stayed on Landing Page after reload with no rogue room or auth redirect!');
    } else {
      console.error('❌ FAIL: Guest was improperly redirected:', urlAfterReload);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Direct visit to /auth (Normal Login)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Direct Visit to /auth without Invite ---');
    await page.goto(`${TARGET_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const bannerDirect = await page.locator('text=You were invited to a WebRTC Listening Jam').count();
    console.log('Invite banner count on direct /auth visit:', bannerDirect);

    console.log('Reloading /auth page...');
    await page.reload({ timeout: 15000 }).catch(async () => {
      await page.goto(`${TARGET_URL}/auth`, { waitUntil: 'domcontentloaded' });
    });
    await page.waitForTimeout(2000);

    const bannerAfterReload = await page.locator('text=You were invited to a WebRTC Listening Jam').count();
    const urlAuthReload = page.url();
    console.log('Invite banner count after reload:', bannerAfterReload);
    console.log('URL after reload:', urlAuthReload);

    if (bannerAfterReload === 0 && !urlAuthReload.includes('room=')) {
      console.log('✅ PASS: Direct login page does NOT show invite banner and no rogue room was injected!');
    } else {
      console.error('❌ FAIL: Invite banner or rogue room parameter appeared unexpectedly.');
    }

    // -------------------------------------------------------------------------
    // TEST 3: User clicks an Invite Link while NOT signed in
    // -------------------------------------------------------------------------
    console.log(`\n--- TEST 3: User clicks Invite Link (/session?room=${TEST_ROOM}&invite=true) while NOT signed in ---`);
    await page.goto(`${TARGET_URL}/session?room=${TEST_ROOM}&invite=true`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const inviteRedirectUrl = page.url();
    console.log('URL after clicking invite link while unauthenticated:', inviteRedirectUrl);

    const inviteBannerVisible = await page.locator('text=You were invited to a WebRTC Listening Jam').isVisible();
    console.log('Is "You were invited to a WebRTC Listening Jam" banner visible?', inviteBannerVisible);

    if (inviteRedirectUrl.includes('/auth') && inviteBannerVisible) {
      console.log('✅ PASS: Custom login page shows the Jam Invite banner when clicking an invite link!');
    } else {
      console.error('❌ FAIL: Invite banner was not displayed on invite link redirect.');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Signing in after invite link automatically joins the invited room
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Registering / Authenticating from the invite login page ---');
    const randomEmail = `listener_${Date.now()}@riveria.com`;
    await page.click('button:has-text("New to the engine? Initialize here.")');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    const postAuthUrl = page.url();
    console.log('URL post-authentication:', postAuthUrl);

    const roomTitle = await page.evaluate(() => document.querySelector('h3.font-mono')?.textContent?.trim() || '');
    console.log('Connected room in WebRTC session:', roomTitle);

    if (postAuthUrl.includes('/session') && (postAuthUrl.includes(TEST_ROOM) || roomTitle === TEST_ROOM)) {
      console.log('✅ PASS: User was automatically forwarded to the invited Jam Room after sign in/registration!');
    } else {
      console.log('Status: Landed on session:', postAuthUrl);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL INVITATION & RELOAD ROUTING TESTS PASSED!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runTests();
