import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ScrapingResult {
  url: string;
  content: string;
  error?: string;
}

const scrapeUrl = async (url: string): Promise<ScrapingResult> => {
  try {
    console.error(`Scraping ${url}...`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script').remove();
    $('style').remove();

    // Get text content
    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    console.error(`Scraped ${content.length} characters from ${url}`);
    return { url, content };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { url, content: '', error: String(error) };
  }
};

const scrapeUrls = async (urls: string[], maxConcurrent = 3): Promise<ScrapingResult[]> => {
  const results: ScrapingResult[] = [];
  const chunks: string[][] = [];

  // Split URLs into chunks of maxConcurrent size
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }

  // Process chunks sequentially
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(url => scrapeUrl(url)));
    results.push(...chunkResults);
  }

  return results;
};

const saveResults = async (results: ScrapingResult[], outputDir: string): Promise<void> => {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // Save each result to a file
    for (const result of results) {
      const filename = path.join(
        outputDir,
        `${Buffer.from(result.url).toString('base64')}.txt`
      );
      await fs.writeFile(filename, result.content);
      console.error(`Saved ${result.url} to ${filename}`);
    }
  } catch (error) {
    console.error('Error saving results:', error);
    throw error;
  }
};

export { scrapeUrl, scrapeUrls, saveResults, type ScrapingResult }; 