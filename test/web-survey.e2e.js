import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const TARGETS = {
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/' },
  claude: { name: 'Claude', url: 'https://claude.ai/' },
  grok: { name: 'Grok', url: 'https://grok.com/' },
  copilot: { name: 'Microsoft Copilot', url: 'https://copilot.cloud.microsoft/' },
  perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/' },
  poe: { name: 'Poe', url: 'https://poe.com/' },
  mistral: { name: 'Mistral Vibe', url: 'https://chat.mistral.ai/' },
  meta: { name: 'Meta AI', url: 'https://www.meta.ai/' },
  deepseek: { name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  qwen: { name: 'Qwen', url: 'https://chat.qwen.ai/' },
  kimi: { name: 'Kimi', url: 'https://www.kimi.com/' },
  zai: { name: 'Z.ai', url: 'https://chat.z.ai/' },
  minimax: { name: 'MiniMax Agent', url: 'https://agent.minimax.io/' },
  doubao: { name: 'Doubao', url: 'https://www.doubao.com/chat/' },
  yuanbao: { name: 'Tencent Yuanbao', url: 'https://yuanbao.tencent.com/' }
};

const targetId = process.env.TARGET;
if (!targetId || !TARGETS[targetId]) {
  throw new Error(`Set TARGET to one of: ${Object.keys(TARGETS).join(', ')}`);
}

const target = TARGETS[targetId];
const artifactDir = path.join('artifacts', 'web-survey', targetId);
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'en-US'
});
const page = await context.newPage();
page.setDefaultTimeout(12_000);

const result = {
  id: targetId,
  provider: target.name,
  target: target.url,
  testedAt: new Date().toISOString(),
  pageLoad: false,
  inputSurface: false,
  promptSubmit: false,
  authRequired: false,
  modelResponse: false,
  blocked: false,
  capability: 'unknown',
  finalUrl: null,
  title: null,
  inputSelector: null,
  submitMethod: null,
  notes: []
};

const PROMPT = 'What is 137 + 286? Reply with digits only.';
const EXPECTED = '423';

function looksLikeAuthUrl(url) {
  return /(?:login|signin|sign-in|oauth|authorize|auth\.)/i.test(url);
}

function bodyLooksBlocked(text) {
  return /(access denied|verify you are human|checking your browser|captcha|unusual traffic|not available in your region|service unavailable in your region|forbidden)/i.test(text);
}

async function visibleInputCandidates() {
  return page.locator('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]')
    .evaluateAll((els) => els.map((el, index) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const visible = r.width > 80 && r.height > 18 && style.visibility !== 'hidden' && style.display !== 'none';
      return {
        index,
        visible,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        role: el.getAttribute('role') || '',
        placeholder: el.getAttribute('placeholder') || '',
        aria: el.getAttribute('aria-label') || '',
        contenteditable: el.getAttribute('contenteditable') || '',
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height
      };
    }).filter(x => x.visible));
}

async function chooseComposer(candidates) {
  if (!candidates.length) return null;
  const scored = candidates.map((c) => {
    const hint = `${c.placeholder} ${c.aria} ${c.id} ${c.role}`.toLowerCase();
    let score = c.y + c.width / 10;
    if (/(ask|message|chat|prompt|question|send|anything|help)/.test(hint)) score += 1500;
    if (/(search|email|password|phone|username)/.test(hint)) score -= 1800;
    if (c.tag === 'textarea' || c.contenteditable === 'true') score += 400;
    return { ...c, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0];
}

async function locatorForCandidate(candidate) {
  const base = page.locator('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');
  return base.nth(candidate.index);
}

async function setText(locator, text) {
  const tag = await locator.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
  const editable = await locator.getAttribute('contenteditable').catch(() => null);
  if (tag === 'textarea' || tag === 'input') {
    await locator.fill(text);
    return;
  }
  if (editable === 'true') {
    await locator.click();
    await locator.press('Control+A').catch(() => {});
    await locator.press('Backspace').catch(() => {});
    await locator.evaluate((el, value) => {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    }, text);
    return;
  }
  throw new Error('unsupported input element');
}

async function findSendButton() {
  const selectors = [
    'button[type="submit"]',
    '[data-testid*="send" i]',
    '[data-testid*="submit" i]',
    'button[aria-label*="send" i]',
    'button[aria-label*="submit" i]',
    'button[title*="send" i]',
    'button[title*="submit" i]',
    '[role="button"][aria-label*="send" i]',
    '[role="button"][aria-label*="submit" i]'
  ];
  for (const selector of selectors) {
    const loc = page.locator(selector).last();
    if (await loc.isVisible().catch(() => false)) return { loc, selector };
  }
  return null;
}

try {
  const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  result.pageLoad = Boolean(response) || page.url().startsWith('http');
  await page.waitForTimeout(2500);
  result.finalUrl = page.url();
  result.title = await page.title().catch(() => '');

  let bodyText = await page.locator('body').innerText().catch(() => '');
  if (bodyLooksBlocked(bodyText)) {
    result.blocked = true;
    result.capability = 'blocked';
    result.notes.push('Page text matched a generic access/verification block indicator.');
  }

  const candidates = await visibleInputCandidates().catch(() => []);
  const composer = await chooseComposer(candidates);
  if (!composer) {
    if (looksLikeAuthUrl(page.url()) || /sign in|log in|login required/i.test(bodyText)) {
      result.authRequired = true;
      result.capability = 'account_required';
    }
    result.notes.push('No plausible visible chat composer found by the low-friction generic probe.');
  } else {
    result.inputSurface = true;
    result.inputSelector = composer.id ? `#${composer.id}` : `${composer.tag}[index=${composer.index}]`;
    const locator = await locatorForCandidate(composer);
    await setText(locator, PROMPT);

    const send = await findSendButton();
    if (send) {
      await send.loc.click();
      result.promptSubmit = true;
      result.submitMethod = send.selector;
    } else {
      await locator.press('Enter');
      result.promptSubmit = true;
      result.submitMethod = 'Enter';
    }

    const start = Date.now();
    while (Date.now() - start < 18_000) {
      await page.waitForTimeout(600);
      result.finalUrl = page.url();
      result.title = await page.title().catch(() => result.title);
      bodyText = await page.locator('body').innerText().catch(() => '');

      if (looksLikeAuthUrl(page.url()) || /login required|sign in to continue|log in to continue|sign up to continue/i.test(bodyText)) {
        result.authRequired = true;
        result.capability = 'account_required';
        break;
      }

      if (bodyLooksBlocked(bodyText)) {
        result.blocked = true;
        result.capability = 'blocked';
        break;
      }

      const exact = page.getByText(EXPECTED, { exact: true });
      if (await exact.count().catch(() => 0)) {
        let visible = false;
        const n = await exact.count().catch(() => 0);
        for (let i = 0; i < n; i++) {
          if (await exact.nth(i).isVisible().catch(() => false)) {
            visible = true;
            break;
          }
        }
        if (visible) {
          result.modelResponse = true;
          result.capability = 'anonymous_chat';
          break;
        }
      }
    }

    if (result.capability === 'unknown') {
      result.notes.push('Prompt was submitted, but the generic probe did not observe either the expected answer or a clear auth/block transition within 18 seconds.');
    }
  }
} catch (error) {
  result.notes.push(`${error.name}: ${error.message}`);
  if (/ERR_|net::|timeout/i.test(error.message)) result.capability = result.blocked ? 'blocked' : 'unavailable';
} finally {
  result.finalUrl = page.url();
  result.title = await page.title().catch(() => result.title);
  await page.screenshot({ path: path.join(artifactDir, 'page.png'), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(artifactDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}
