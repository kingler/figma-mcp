import { z } from "zod";
import puppeteer from "puppeteer";

export const puppeteerToolName = "puppeteer";
export const puppeteerToolDescription = "Control browser automation with Puppeteer";

declare global {
  interface Window {
    mcpHelper?: {
      logs: string[];
      originalConsole: typeof console;
    };
  }
}

export const PuppeteerToolSchema = z.object({
  action: z.enum([
    "navigate",
    "screenshot",
    "click",
    "fill",
    "select",
    "hover",
    "evaluate"
  ]).describe("Action to perform"),
  url: z.string().optional().describe("URL to navigate to"),
  selector: z.string().optional().describe("CSS selector for element"),
  value: z.string().optional().describe("Value to fill or select"),
  script: z.string().optional().describe("JavaScript code to evaluate"),
  screenshotOptions: z.object({
    name: z.string().describe("Name for the screenshot"),
    width: z.number().optional().default(1920).describe("Viewport width"),
    height: z.number().optional().default(1080).describe("Viewport height"),
    fullPage: z.boolean().optional().default(false).describe("Capture full page")
  }).optional()
});

let browser: puppeteer.Browser | undefined;
let page: puppeteer.Page | undefined;
const consoleLogs: string[] = [];

async function ensureBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const pages = await browser.pages();
    page = pages[0];

    page.on("console", (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
    });
  }
  return page!;
}

export async function runPuppeteerTool(args: z.infer<typeof PuppeteerToolSchema>) {
  try {
    const page = await ensureBrowser();

    switch (args.action) {
      case "navigate": {
        if (!args.url) {
          throw new Error("URL is required for navigate action");
        }
        await page.goto(args.url, { waitUntil: "networkidle0" });
        return {
          content: [{
            type: "text",
            text: `Navigated to ${args.url}`
          }],
          isError: false
        };
      }

      case "screenshot": {
        if (!args.screenshotOptions?.name) {
          throw new Error("Screenshot name is required for screenshot action");
        }

        const { name, width = 1920, height = 1080, fullPage = false } = args.screenshotOptions;
        await page.setViewport({ width, height });

        const screenshot = await (args.selector ?
          (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
          page.screenshot({ encoding: "base64", fullPage }));

        if (!screenshot) {
          throw new Error(args.selector ? `Element not found: ${args.selector}` : "Screenshot failed");
        }

        return {
          content: [
            {
              type: "text",
              text: `Screenshot '${name}' taken at ${width}x${height}`
            },
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png"
            }
          ],
          isError: false
        };
      }

      case "click": {
        if (!args.selector) {
          throw new Error("Selector is required for click action");
        }
        await page.click(args.selector);
        return {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`
          }],
          isError: false
        };
      }

      case "fill": {
        if (!args.selector || !args.value) {
          throw new Error("Selector and value are required for fill action");
        }
        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Filled ${args.selector} with: ${args.value}`
          }],
          isError: false
        };
      }

      case "select": {
        if (!args.selector || !args.value) {
          throw new Error("Selector and value are required for select action");
        }
        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
          content: [{
            type: "text",
            text: `Selected ${args.selector} with: ${args.value}`
          }],
          isError: false
        };
      }

      case "hover": {
        if (!args.selector) {
          throw new Error("Selector is required for hover action");
        }
        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        return {
          content: [{
            type: "text",
            text: `Hovered ${args.selector}`
          }],
          isError: false
        };
      }

      case "evaluate": {
        if (!args.script) {
          throw new Error("Script is required for evaluate action");
        }

        // Clear console logs
        consoleLogs.length = 0;

        // Execute script
        const result = await page.evaluate(args.script);

        return {
          content: [{
            type: "text",
            text: `Execution result:\n${JSON.stringify(result, null, 2)}\n\nConsole output:\n${consoleLogs.join('\n')}`
          }],
          isError: false
        };
      }

      default:
        throw new Error(`Unknown action: ${args.action}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

// Cleanup on process exit
process.on("exit", async () => {
  if (browser) {
    await browser.close();
  }
}); 