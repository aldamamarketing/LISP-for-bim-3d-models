import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    # Ensure the directory exists
    os.makedirs('/home/jules/verification/screenshots', exist_ok=True)
    os.makedirs('/home/jules/verification/videos', exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Using the static HTML output path built by vite singlefile build
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_video_dir='/home/jules/verification/videos/'
        )
        page = await context.new_page()

        file_url = 'file:///app/web/public/palette-builds/palette.html'
        print(f"Navigating to {file_url}")

        try:
            await page.goto(file_url, wait_until='networkidle', timeout=10000)

            # Wait for any component rendering
            await page.wait_for_timeout(2000)

            # Look for the trigger button
            button = page.locator('button[aria-haspopup="menu"]').first
            if await button.count() > 0:
                print("Found menu trigger button, clicking...")
                await button.click()

                # Wait for the dropdown to appear
                await page.wait_for_timeout(1000)

                # Take screenshot of the opened dropdown menu
                await page.screenshot(path='/home/jules/verification/screenshots/palette_dropdown.png')
                print("Screenshot saved to /home/jules/verification/screenshots/palette_dropdown.png")
            else:
                print("Menu trigger button not found.")
                # Fallback screenshot
                await page.screenshot(path='/home/jules/verification/screenshots/palette_fallback.png')

        except Exception as e:
            print(f"Error during verification: {e}")
            await page.screenshot(path='/home/jules/verification/screenshots/palette_error.png')

        await context.close()
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
