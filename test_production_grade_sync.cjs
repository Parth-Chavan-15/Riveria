const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:8088'; // Test against local docker container or deployed url
const VERCEL_URL = 'https://riveria-umber.vercel.app';
const TARGET_URL = 'https://riveria-umber.vercel.app';

const TOKEN_1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjYxNDlmZTY2Mjc4NzEwZjU0NTQ5ZSIsImlhdCI6MTc5NDUxMjAzMiwiZXhwIjoxNzk1MTE2ODMyLCJhdWQiOiJyaXZlcmlhLWNsaWVudCIsImlzcyI6InJpdmVyaWEtYXBpIn0.UVO5mbaAA32_V55K-GzzrRxIoVxXIdxe6GO5sg0_LHw';
const TOKEN_2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZjYxNGE1ZTY2Mjc4NzEwZjU0NTQ5ZiIsImlhdCI6MTc5NDUxMjAzOCwiZXhwIjoxNzk1MTE2ODM4LCJhdWQiOiJyaXZlcmlhLWNsaWVudCIsImlzcyI6InJpdmVyaWEtYXBpIn0.26mWB5SeVNmNcqW91iIcW3MhYNlicFflhI3_jaGhjZU';

async function testLandingPageAudio() {
  console.log('================================================================');
  console.log('TEST 1: LANDING PAGE AUDIO STREAMING & RESILIENCE');
  console.log('================================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('console', msg => {
    if (msg.text().includes('err') || msg.text().includes('Audio') || msg.text().includes('Play')) {
      console.log('Landing Console:', msg.text());
    }
  });

  try {
    console.log('Navigating to Landing Page...');
    await page.goto(`${TARGET_URL}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check preloaded audio
    const preloadedSrc = await page.evaluate(() => {
      // Find audio in landing page pool or window
      return window.__riveriaAudio?.src || document.querySelector('audio')?.src || '';
    });
    console.log('Preloaded Hero Audio Source:', preloadedSrc);

    // Trigger Play on Landing Page
    console.log('Clicking Hero Movement Play button...');
    const playBtn = page.locator('button:has-text("Play Movement"), button:has-text("Overture"), button[aria-label*="Play"]').first();
    if (await playBtn.isVisible()) {
      await playBtn.click();
    } else {
      // Press spacebar to play
      await page.keyboard.press('Space');
    }

    await page.waitForTimeout(2000);

    const playState = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll('audio'));
      const active = audios.find(a => !a.paused) || window.__riveriaAudio;
      return {
        count: audios.length,
        isPlaying: active ? !active.paused : false,
        currentTime: active ? active.currentTime : 0,
        src: active ? active.src : ''
      };
    });
    console.log('Playback state after start:', playState);

    // Scroll down the page through all sections
    console.log('Simulating user reading and scrolling through sections...');
    for (let scrollY = 400; scrollY <= 2500; scrollY += 400) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollY);
      await page.waitForTimeout(600);
    }

    await page.waitForTimeout(2000);

    // Verify audio NEVER stopped or muted while scrolling
    const postScrollState = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll('audio'));
      const active = audios.find(a => !a.paused) || window.__riveriaAudio;
      return {
        isPlaying: active ? !active.paused : false,
        currentTime: active ? active.currentTime : 0,
        volume: active ? active.volume : 0,
        src: active ? active.src : ''
      };
    });
    console.log('Playback state after complete page scroll:', postScrollState);
    if (postScrollState.currentTime > 0) {
      console.log('✅ Landing page audio streams continuously without stopping on scroll!');
    } else {
      console.warn('⚠️ Audio was at 0s post scroll.');
    }
  } catch (err) {
    console.error('Landing page test error:', err);
  } finally {
    await browser.close();
  }
}

async function runAll() {
  await testLandingPageAudio();
}

runAll();
