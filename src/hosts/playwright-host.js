import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

export class PlaywrightHost {
  constructor({ headless = true, timeoutMs = 30_000, executablePath = process.env.CHROME_PATH || null } = {}) {
    this.headless = headless;
    this.timeoutMs = timeoutMs;
    this.executablePath = executablePath;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async start() {
    this.browser = await chromium.launch({
      headless: this.headless,
      ...(this.executablePath ? { executablePath: this.executablePath } : {})
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US'
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.timeoutMs);
    return this;
  }

  async close() {
    await this.browser?.close();
  }

  async goto(url) {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async firstVisible(selectors) {
    for (const selector of selectors) {
      const loc = this.page.locator(selector).last();
      try {
        if (await loc.isVisible({ timeout: 700 })) return loc;
      } catch {}
    }
    return null;
  }

  async visibleTexts(selectors) {
    const out = [];
    for (const selector of selectors) {
      const loc = this.page.locator(selector);
      const n = await loc.count().catch(() => 0);
      for (let i = 0; i < n; i++) {
        const item = loc.nth(i);
        try {
          if (await item.isVisible()) {
            const text = (await item.innerText()).trim();
            if (text) out.push(text);
          }
        } catch {}
      }
    }
    return out;
  }

  async setComposerText(locator, text) {
    const tag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    const contentEditable = await locator.getAttribute('contenteditable').catch(() => null);

    if (tag === 'textarea' || tag === 'input') {
      await locator.fill(text);
      return;
    }

    if (contentEditable === 'true') {
      await locator.click();
      await locator.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
      await locator.press('Backspace').catch(() => {});
      await locator.evaluate((el, value) => {
        el.focus();
        el.textContent = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      }, text);
      return;
    }

    throw new Error('Unsupported composer element');
  }

  async saveDiagnostics(dir = 'artifacts') {
    if (!this.page) return;
    await fs.mkdir(dir, { recursive: true });
    await this.page.screenshot({ path: path.join(dir, 'page.png'), fullPage: true }).catch(() => {});
    const html = await this.page.content().catch(() => '');
    await fs.writeFile(path.join(dir, 'page.html'), html, 'utf8').catch(() => {});
    const meta = {
      url: this.page.url(),
      title: await this.page.title().catch(() => ''),
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8').catch(() => {});
  }
}
