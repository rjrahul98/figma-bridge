/**
 * Playwright renderer — renders a React component in a headless
 * browser and captures a screenshot + DOM tree for comparison.
 */

import type { Browser, Page } from 'playwright';
import { logger } from '../utils/logger.js';

export interface RenderResult {
  /** Screenshot as a PNG buffer. */
  screenshot: Buffer;
  /** The page instance (kept open for DOM extraction). */
  page: Page;
}

export interface RendererOptions {
  /** Dev server base URL (default: http://localhost:3000). */
  serverUrl?: string;
  /** Route to load (default: /__figma-bridge-preview). */
  route?: string;
  /** Viewport width (default: 1280). */
  width?: number;
  /** Viewport height (default: 800). */
  height?: number;
  /** Global CSS path to inject. */
  globalCss?: string;
}

let _browser: Browser | null = null;

/**
 * Get or launch a shared Playwright browser instance.
 */
async function getBrowser(): Promise<Browser> {
  if (_browser) return _browser;
  const { chromium } = await import('playwright');
  _browser = await chromium.launch({ headless: true });
  return _browser;
}

/**
 * Render a TSX component string in the browser and take a screenshot.
 *
 * This works by navigating to the preview route on the dev server,
 * which hosts the component in an isolated harness.
 */
export async function renderComponent(
  _tsx: string,
  options: RendererOptions = {},
): Promise<RenderResult> {
  const {
    serverUrl = 'http://localhost:3000',
    route = '/__figma-bridge-preview',
    width = 1280,
    height = 800,
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setViewportSize({ width, height });

  const fullUrl = `${serverUrl}${route}`;

  logger.debug(`Rendering at ${fullUrl}`);

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15_000 });
  } catch {
    throw new Error(
      `Could not reach ${fullUrl}. Make sure your dev server is running.`,
    );
  }

  // Wait a beat for any CSS transitions / lazy images.
  await page.waitForTimeout(500);

  const screenshot = await page.screenshot({ type: 'png', fullPage: false });

  return { screenshot, page };
}

/**
 * Render a route on the dev server and take a screenshot.
 * Used by the audit command.
 */
export async function renderPage(
  serverUrl: string,
  route: string,
  options: { width?: number; height?: number; selector?: string } = {},
): Promise<RenderResult> {
  const { width = 1280, height = 800, selector } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });

  const fullUrl = `${serverUrl}${route}`;

  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15_000 });
  } catch {
    throw new Error(
      `Could not reach ${fullUrl}. Make sure your dev server is running.`,
    );
  }

  await page.waitForTimeout(500);

  let screenshot: Buffer;
  if (selector && selector !== 'body') {
    const element = await page.$(selector);
    if (!element) throw new Error(`Selector "${selector}" not found on page.`);
    screenshot = (await element.screenshot({ type: 'png' })) as Buffer;
  } else {
    screenshot = (await page.screenshot({ type: 'png', fullPage: false })) as Buffer;
  }

  return { screenshot, page };
}

/**
 * Close the shared browser (call at process exit).
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
