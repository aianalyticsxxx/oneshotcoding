const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');

const VIDEO_DURATION = 20000; // 20 seconds
const OUTPUT_FILE = path.join(__dirname, 'oneshot-launch.mp4');

async function recordVideo() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless recording
    args: [
      '--window-size=1080,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1080,
    height: 1080,
    deviceScaleFactor: 1
  });

  const recorderConfig = {
    followNewTab: false,
    fps: 30,
    videoFrame: {
      width: 1080,
      height: 1080
    },
    aspectRatio: '1:1'
  };

  const recorder = new PuppeteerScreenRecorder(page, recorderConfig);

  console.log('Loading animation...');
  await page.goto(`file://${path.join(__dirname, 'video-final.html')}`);

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));

  console.log('Starting recording...');
  await recorder.start(OUTPUT_FILE);

  // Reload to start animation fresh
  await page.reload();
  await page.evaluate(() => document.fonts.ready);

  // Wait for animation duration
  console.log(`Recording for ${VIDEO_DURATION / 1000} seconds...`);
  await new Promise(r => setTimeout(r, VIDEO_DURATION));

  console.log('Stopping recording...');
  await recorder.stop();

  await browser.close();

  console.log(`\nVideo saved to: ${OUTPUT_FILE}`);
  console.log('\nNext steps:');
  console.log('1. Open the video and verify it looks correct');
  console.log('2. Upload directly to Twitter/X');
  console.log('3. Twitter supports 1:1 square videos up to 2:20');
}

recordVideo().catch(console.error);
