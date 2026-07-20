const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to the viewer
  await page.goto('http://localhost:3005/viewer', { waitUntil: 'networkidle' });

  // Wait a moment for images to load
  await page.waitForTimeout(2000);

  // Take a full page screenshot
  const screenshotPath = 'grid_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`Screenshot saved to ${screenshotPath}`);
  await browser.close();
})();
