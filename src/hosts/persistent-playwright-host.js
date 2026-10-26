import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import { PlaywrightHost } from './playwright-host.js';

export class PersistentPlaywrightHost extends PlaywrightHost {
  constructor({ profileDir, headless = false, timeoutMs = 30_000, executablePath = process.env.CHROME_PATH || null } = {}) {
    super({ headless, timeoutMs, executablePath });
    if (!profileDir) throw new Error('PersistentPlaywrightHost requires profileDir');
    this.profileDir = profileDir;
  }

  async start() {
    await fs.mkdir(this.profileDir, { recursive: true });
    this.context = await chromium.launchPersistentContext(this.profileDir, {
      headless: this.headless,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      ...(this.executablePath ? { executablePath: this.executablePath } : {})
    });
    this.browser = null;
    this.page = this.context.pages()[0] || await this.context.newPage();
    this.page.setDefaultTimeout(this.timeoutMs);
    return this;
  }

  async close() {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }
}
