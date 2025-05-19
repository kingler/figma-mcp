import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs/promises';

interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  output?: string;
}

const takeScreenshot = async (
  url: string,
  options: ScreenshotOptions = {}
): Promise<string> => {
  const {
    width = 1920,
    height = 1080,
    fullPage = false,
    output = 'screenshot.png'
  } = options;

  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create new page
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width, height });

    // Navigate to URL
    console.error(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Ensure output directory exists
    const outputDir = path.dirname(output);
    await fs.mkdir(outputDir, { recursive: true });

    // Take screenshot
    console.error(`Taking screenshot...`);
    await page.screenshot({
      path: output,
      fullPage
    });

    // Close browser
    await browser.close();

    console.error(`Screenshot saved to ${output}`);
    return output;
  } catch (error) {
    console.error('Error taking screenshot:', error);
    throw error;
  }
};

const takeScreenshotSync = (
  url: string,
  output: string,
  width = 1920,
  height = 1080
): Promise<string> => {
  return takeScreenshot(url, { width, height, output });
};

export { takeScreenshot, takeScreenshotSync, type ScreenshotOptions }; 