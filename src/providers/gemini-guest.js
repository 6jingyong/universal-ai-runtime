import { WebProvider } from '../core/web-provider.js';
import { countResponseBlocks, clickFirstVisible, waitForStableResponse } from '../core/web-chat-utils.js';

const URL = 'https://gemini.google.com/';
const INPUT_SELECTORS = [
  'rich-textarea .ql-editor[contenteditable="true"]',
  'div.ql-editor[contenteditable="true"]',
  'rich-textarea > div[contenteditable="true"]'
];
const SEND_SELECTORS = [
  'button[aria-label*="Send message" i]',
  '.send-button-container button',
  'button.send-button',
  '[data-test-id="send-button"]',
  'button[aria-label*="send" i]'
];
const STOP_SELECTORS = [
  'button[aria-label*="Stop" i]',
  '[data-testid="stop-button"]'
];
const RESPONSE_SELECTOR = 'model-response, message-content, response-container';

export class GeminiGuestProvider extends WebProvider {
  constructor() {
    super('gemini-guest', 'Gemini Guest');
    this.url = URL;
  }

  async probe(host) {
    await host.goto(this.url);
    await host.page.waitForTimeout(1800);
    const input = await host.firstVisible(INPUT_SELECTORS);
    const title = await host.page.title().catch(() => '');
    const body = await host.page.locator('body').innerText().catch(() => '');
    const blocked = /just a moment|verify you are human|captcha|unusual traffic/i.test(`${title}\n${body}`);
    return {
      provider: this.id,
      ready: Boolean(input) && !blocked,
      capability: blocked ? 'blocked' : input ? 'anonymous_chat' : 'unavailable',
      url: host.page.url()
    };
  }

  async ask(host, prompt) {
    if (!prompt?.trim()) throw new Error('Prompt is required');
    const started = Date.now();
    const input = await host.firstVisible(INPUT_SELECTORS);
    if (!input) throw new Error('Gemini composer not found');

    const baselineCount = await countResponseBlocks(host.page, RESPONSE_SELECTOR);
    await host.setComposerText(input, prompt);

    const sendSelector = await clickFirstVisible(host.page, SEND_SELECTORS);
    if (!sendSelector) await input.press('Enter');

    const text = await waitForStableResponse(host.page, {
      selector: RESPONSE_SELECTOR,
      baselineCount,
      stopSelectors: STOP_SELECTORS,
      timeoutMs: 45_000,
      stablePolls: 2
    });

    return {
      provider: this.id,
      text,
      elapsedMs: Date.now() - started,
      transport: 'web-dom',
      channel: 'anonymous_web'
    };
  }
}
