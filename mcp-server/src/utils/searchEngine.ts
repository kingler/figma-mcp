import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

const searchWeb = async (query: string): Promise<SearchResult[]> => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cx) {
      throw new Error('Google API key or CSE ID not found in environment variables');
    }

    const url = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: apiKey,
      cx,
      q: query,
      num: 10
    };

    console.error(`Searching for "${query}"...`);
    const response = await axios.get(url, { params });

    if (!response.data.items) {
      console.error('No results found');
      return [];
    }

    const results: SearchResult[] = response.data.items.map((item: any) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet
    }));

    console.error(`Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
};

const scrapeWebPage = async (url: string): Promise<string> => {
  try {
    console.error(`Scraping ${url}...`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $('script').remove();
    $('style').remove();

    // Get text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    console.error(`Scraped ${text.length} characters`);
    return text;
  } catch (error) {
    console.error('Error scraping web page:', error);
    return '';
  }
};

export { searchWeb, scrapeWebPage, type SearchResult }; 