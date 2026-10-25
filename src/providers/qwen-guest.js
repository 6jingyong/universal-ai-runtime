import { WebProvider } from '../core/web-provider.js';
import { countResponseBlocks, clickFirstVisible, waitForStableResponse } from '../core/web-chat-utils.js';

const URL = 'https://chat.qwen.ai/';
const INPUT_SELECTORS = [
  'textarea.message-input-textarea',
  'textarea[placeholder*="Ask Qwen" i]',
  'textarea'
];
const SEND_SELECTORS = [
  '.message-input-right-button-send',
  'button[aria-label*="send" i]',
  'button[type="submit"]'
];
const STOP_SELECTORS = ['[class*="stop" i]'];
const RESPONSE_SELECTOR = [
  '.response-message-content',
  '[class*="response-message-content"]',
  '[class*="assistant" i] [class*="markdown" i]',
  '[class*="message" i][class*="content" i]:not([class*="user" i])'
].join(', ');

export class QwenGuestProvider extends WebProvider {
  constructor() {
    super('qwen-guest', 'Qwen Guest');
    this.url = URL;
  }

  async probe(host) {
    await host.goto(this.url);
    await host.page.waitForTimeout(1800);
    const input = await host.firstVisible(INPUT_SELECTORS);
    const body = await host.page.locator('body').innerText().catch(() => '');
    const authRequired = /sign in to continue|log in to continue|login required/i.test(body);
    return {
      provider: this.id,
      ready: Boolean(input) && !authRequired,
      capability: authRequired ? 'account_required' : input ? 'anonymous_candidate' : 'unavailable',
      url: host.page.url()
    };
  }

  async resolveAgeGate(host) {
    const gateText = host.page.getByText(/confirm your age to continue/i).first();
    if (!await gateText.isVisible().catch(() => false)) return false;

    const continueButton = host.page.getByRole('button', { name: /continue/i }).last();
    if (!await continueButton.isVisible().catch(() => false)) {
      throw new Error('Qwen age gate detected but Continue button was not found');
    }

    await continueButton.click();
    await host.page.waitForTimeout(900);
    return true;
  }

  async ask(host, prompt) {
    if (!prompt?.trim()) throw new Error('Prompt is required');
    const started = Date.now();
    let input = await host.firstVisible(INPUT_SELECTORS);
    if (!input) throw new Error('Qwen composer not found');

    const baselineCount = await countResponseBlocks(host.page, RESPONSE_SELECTOR);
    await host.setComposerText(input, prompt);

    const sendSelector = await clickFirstVisible(host.page, SEND_SELECTORS);
    if (!sendSelector) await input.press('Enter');

    const ageGateHandled = await this.resolveAgeGate(host);
    if (ageGateHandled) {
      input = await host.firstVisible(INPUT_SELECTORS);
      if (input) {
        const remaining = await input.inputValue().catch(async () => (await input.innerText().catch(() => '')).trim());
        if (remaining?.trim()) {
          const retrySend = await clickFirstVisible(host.page, SEND_SELECTORS);
          if (!retrySend) await input.press('Enter');
        }
      }
    }

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
      channel: 'anonymous_web',
      ageGateHandled
    };
  }
}
