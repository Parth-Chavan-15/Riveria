const { chromium } = require('playwright');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8088';

(async () => {
  console.log('================================================================');
  console.log('TESTING LANDING SOUND & SECTIONAL MUSIC SWITCHING');
  console.log('Target URL:', TARGET_URL);
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Audio') || msg.text().includes('reveria:')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  console.log('\n--- STEP 1: Load Landing Page ---');
  await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'networkidle' });

  const initialAudio = await page.evaluate(() => {
    const audio = window.__landingAudio;
    return {
      hasAudio: !!audio,
      src: audio?.src || '',
      paused: audio?.paused,
      volume: audio?.volume,
      currentTime: audio?.currentTime
    };
  });
  console.log('Initial Audio state:', initialAudio);

  console.log('\n--- STEP 2: Click "Experience with Sound" ---');
  const expButton = page.locator('button:has-text("Experience with Sound")');
  await expButton.click();
  await page.waitForTimeout(1500);

  const afterPlayState = await page.evaluate(() => {
    const audio = window.__landingAudio;
    const btn = document.querySelector('button');
    return {
      paused: audio?.paused,
      volume: audio?.volume,
      currentTime: audio?.currentTime,
      src: audio?.src,
      buttonText: btn?.innerText
    };
  });
  console.log('Audio State after click:', afterPlayState);

  if (afterPlayState.paused === false && afterPlayState.volume > 0) {
    console.log('✅ PASS: Audio is actively playing with sound!');
  } else {
    console.error('❌ FAIL: Audio is NOT playing or muted!', afterPlayState);
    process.exit(1);
  }

  console.log('\n--- STEP 3: Scroll to Section 1 (Philosophy - Birds) ---');
  await page.evaluate(() => {
    const el = document.getElementById('philosophy');
    el?.scrollIntoView({ behavior: 'smooth' });
  });
  // Wait for 250ms debounce + 300ms fade
  await page.waitForTimeout(2000);

  const section1State = await page.evaluate(() => {
    const audio = window.__landingAudio;
    return {
      paused: audio?.paused,
      volume: audio?.volume,
      currentTime: audio?.currentTime,
      src: audio?.src
    };
  });
  console.log('Audio State at Philosophy section:', section1State);
  if (section1State.src.includes('birds') && section1State.paused === false) {
    console.log('✅ PASS: Music switched seamlessly to Birds (Section 1)!');
  } else {
    console.error('❌ FAIL: Music did not switch to Birds!', section1State);
    process.exit(1);
  }

  console.log('\n--- STEP 4: Scroll to Section 2 (Console / Chamber - Thunder) ---');
  await page.evaluate(() => {
    const el = document.getElementById('chamber');
    el?.scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(2000);

  const section2State = await page.evaluate(() => {
    const audio = window.__landingAudio;
    return {
      paused: audio?.paused,
      volume: audio?.volume,
      currentTime: audio?.currentTime,
      src: audio?.src
    };
  });
  console.log('Audio State at Chamber section:', section2State);
  if (section2State.src.includes('thunder') && section2State.paused === false) {
    console.log('✅ PASS: Music switched seamlessly to Thunder (Section 2)!');
  } else {
    console.error('❌ FAIL: Music did not switch to Thunder!', section2State);
    process.exit(1);
  }

  console.log('\n--- STEP 5: Scroll back to Section 0 (Prologue - Sunflower) ---');
  await page.evaluate(() => {
    const el = document.getElementById('prologue');
    el?.scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(2000);

  const section0State = await page.evaluate(() => {
    const audio = window.__landingAudio;
    return {
      paused: audio?.paused,
      volume: audio?.volume,
      currentTime: audio?.currentTime,
      src: audio?.src
    };
  });
  console.log('Audio State back at Prologue:', section0State);
  if (section0State.src.includes('sunflower') && section0State.paused === false) {
    console.log('✅ PASS: Music switched back seamlessly to Sunflower (Section 0)!');
  } else {
    console.error('❌ FAIL: Music did not switch back to Sunflower!', section0State);
    process.exit(1);
  }

  console.log('\n--- STEP 6: Click "Pause Sound" ---');
  const pauseButton = page.locator('button:has-text("Pause Sound")');
  await pauseButton.click();
  await page.waitForTimeout(1000);

  const pauseState = await page.evaluate(() => {
    const audio = window.__landingAudio;
    return {
      paused: audio?.paused,
      currentTime: audio?.currentTime
    };
  });
  console.log('Audio State after pause:', pauseState);
  if (pauseState.paused === true) {
    console.log('✅ PASS: Audio paused successfully!');
  } else {
    console.error('❌ FAIL: Audio did not pause!', pauseState);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL SOUND & SECTIONAL MUSIC TESTS PASSED!');
  console.log('================================================================');

  await browser.close();
})();
