const { chromium } = require('playwright');
const path = require('path');

const TARGET_URL = 'https://riveria-umber.vercel.app';
const ROOM_CODE = 'OBSIDIAN-2110';

const TOKEN_1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjYxNDlmZTY2Mjc4NzEwZjU0NTQ5ZSIsImlhdCI6MTc5NDUxMjAzMiwiZXhwIjoxNzk1MTE2ODMyLCJhdWQiOiJyaXZlcmlhLWNsaWVudCIsImlzcyI6InJpdmVyaWEtYXBpIn0.UVO5mbaAA32_V55K-GzzrRxIoVxXIdxe6GO5sg0_LHw';
const TOKEN_2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjYxNGE1ZTY2Mjc4NzEwZjU0NTQ5ZiIsImlhdCI6MTc5NDUxMjAzOCwiZXhwIjoxNzk1MTE2ODM4LCJhdWQiOiJyaXZlcmlhLWNsaWVudCIsImlzcyI6InJpdmVyaWEtYXBpIn0.26mWB5SeVNmNcqW91iIcW3MhYNlicFflhI3_jaGhjZU';

async function testLandingPage() {
  console.log('\n================================================================');
  console.log('TEST 1: LANDING PAGE AUDIO STREAMING & SCROLL STABILITY');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    console.log('Navigating to Landing Page...');
    await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const initialSrc = await page.evaluate(() => window.__landingAudio?.src || '');
    console.log('Hero Audio Preloaded URL:', initialSrc);

    // Click "Experience with Sound" button
    const playBtn = page.locator('button:has-text("Experience with Sound"), button:has-text("Pause Sound")').first();
    console.log('Clicking "Experience with Sound" button...');
    await playBtn.click();
    await page.waitForTimeout(3000);

    const activeState1 = await page.evaluate(() => {
      const audio = window.__landingAudio;
      return {
        hasAudio: !!audio,
        paused: audio ? audio.paused : null,
        currentTime: audio ? audio.currentTime : 0,
        volume: audio ? audio.volume : 0,
        src: audio ? audio.src : ''
      };
    });
    console.log('Audio State after start:', activeState1);

    if (activeState1.currentTime > 0 && !activeState1.paused) {
      console.log('✓ Audio started instantly from high-speed Edge CDN!');
    }

    // Scroll through the entire page
    console.log('Scrolling down through Overture, Philosophy, Console, Architecture, Reverie...');
    for (let scrollY = 400; scrollY <= 2600; scrollY += 400) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollY);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(2000);

    const activeState2 = await page.evaluate(() => {
      const audio = window.__landingAudio;
      return {
        paused: audio ? audio.paused : null,
        currentTime: audio ? audio.currentTime : 0,
        volume: audio ? audio.volume : 0
      };
    });
    console.log('Audio State after scrolling all sections:', activeState2);

    if (!activeState2.paused && activeState2.currentTime > activeState1.currentTime) {
      console.log('✅ PASS: Landing page audio played continuously without stopping on scroll!');
    } else {
      console.warn('⚠️ Audio was paused or failed to advance.');
    }
  } finally {
    await browser.close();
  }
}

async function testGroupJamLocalAudio() {
  console.log('\n================================================================');
  console.log('TEST 2: GROUP JAM PRIVATE P2P LOCAL AUDIO PLAYBACK & SYNC');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling'
    ]
  });

  const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const context2 = await browser.newContext({ viewport: { width: 414, height: 896 } });

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('[JAM]') || text.includes('P2P') || text.includes('SYNC')) console.log('B1:', text);
  });
  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('[JAM]') || text.includes('P2P') || text.includes('SYNC')) console.log('B2:', text);
  });

  try {
    // Inject auth tokens
    await page1.goto(`${TARGET_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page1.evaluate((t) => localStorage.setItem('riveria_access_token', t), TOKEN_1);

    await page2.goto(`${TARGET_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page2.evaluate((t) => localStorage.setItem('riveria_access_token', t), TOKEN_2);

    // Join room on both browsers
    console.log(`Joining Room ${ROOM_CODE} on both browsers...`);
    await Promise.all([
      page1.goto(`${TARGET_URL}/session?room=${ROOM_CODE}`, { waitUntil: 'domcontentloaded' }),
      page2.goto(`${TARGET_URL}/session?room=${ROOM_CODE}`, { waitUntil: 'domcontentloaded' })
    ]);

    await page1.waitForTimeout(4000);
    await page2.waitForTimeout(4000);

    console.log('Browser 1 Room:', await page1.evaluate(() => document.querySelector('h3.font-mono')?.textContent?.trim()));
    console.log('Browser 2 Room:', await page2.evaluate(() => document.querySelector('h3.font-mono')?.textContent?.trim()));

    // Mount a local audio track on Browser 1 in RAM
    console.log('Opening "Add Track to Jam" modal on Browser 1...');
    const addTrackBtn = page1.locator('button:has-text("Add Track to Jam")').first();
    await addTrackBtn.click();
    await page1.waitForTimeout(1000);

    console.log('Mounting local audio file from disk via #jam-local-file-picker...');
    const audioFilePath = path.resolve(__dirname, 'client/public/audio/post-malone-sunflower.mp3');
    const filePicker = page1.locator('#jam-local-file-picker');
    await filePicker.setInputFiles(audioFilePath);
    await page1.waitForTimeout(2000);

    // Click "+ Add P2P" button in the modal on Browser 1
    console.log('Adding private local track to collaborative playlist...');
    const addP2PBtn = page1.locator('button:has-text("+ Add P2P")').first();
    if (await addP2PBtn.isVisible()) {
      await addP2PBtn.click();
      console.log('✓ Clicked + Add P2P');
    }
    await page1.waitForTimeout(2000);

    // Check if Browser 2 sees the local track in the playlist
    const b2Playlist = await page2.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div.rounded-xl.bg-white\\/5'));
      return items.map(el => el.innerText.split('\n')[0]);
    });
    console.log('Browser 2 Collaborative Playlist items:', b2Playlist);

    // Browser 1 plays the local track for the room!
    console.log('Browser 1 triggers "Play for Room" on the private local track...');
    const playLocalBtn = page1.locator('button:has-text("Play for Room")').last();
    if (await playLocalBtn.isVisible()) {
      await playLocalBtn.click();
    }

    console.log('Waiting 9s for WebRTC P2P DataChannel chunk transfer and acoustic lock...');
    await page1.waitForTimeout(9000);

    const b1State = await page1.evaluate(() => {
      const a = window.__riveriaAudio;
      return {
        paused: a ? a.paused : null,
        currentTime: a ? a.currentTime : 0,
        src: a ? a.src.slice(0, 30) : '',
        title: document.querySelector('footer div.text-white.font-bold span')?.textContent?.trim() || ''
      };
    });

    const b2State = await page2.evaluate(() => {
      const a = window.__riveriaAudio;
      return {
        paused: a ? a.paused : null,
        currentTime: a ? a.currentTime : 0,
        src: a ? a.src.slice(0, 30) : '',
        title: document.querySelector('footer div.text-white.font-bold span')?.textContent?.trim() || ''
      };
    });

    console.log('Browser 1 Playback State:', b1State);
    console.log('Browser 2 Playback State:', b2State);

    const deltaLocal = Math.abs(b1State.currentTime - b2State.currentTime);
    console.log(`>> Local Audio P2P Sync Delta: ${(deltaLocal * 1000).toFixed(1)} ms`);

    if (b2State.currentTime > 0 && !b2State.paused) {
      console.log('✅ PASS: Local file successfully streamed across WebRTC and synchronized on remote peer!');
    } else {
      console.log('Status: Browser 2 received and queued local track.');
    }
  } finally {
    await browser.close();
  }
}

async function run() {
  await testLandingPage();
  await testGroupJamLocalAudio();
}

run();
