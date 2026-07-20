const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 1080 } });
    await page.goto('http://localhost:3005/jpg');
    // Wait for images to load
    await page.waitForTimeout(2000);
    
    // Get full height
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: 1200, height: bodyHeight });
    
    await page.screenshot({ path: path.join(__dirname, 'jpg_grid_screenshot.png'), fullPage: true });
    await browser.close();
    console.log("Screenshot saved at scripts/jpg_grid_screenshot.png");
})();
