import { WebProvider } from '../core/web-provider.js';

const SELECTORS = {
  composer: [
    '#userInput',
    '[data-testid="composer-input"]',
    'textarea[placeholder*="Message Copilot" i]',
    'textarea[aria-label*="Copilot" i]',
    'div[contenteditable="true"][role="textbox"]'
  ],
  send: [
    '[data-testid="submit-button"]',
    'button[aria-label="Submit message"]',
    'button[aria-label*="Send" i]'
  ],
  stop: [
    '[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]'
  ],
  response: [
    '[data-testid="ai-message"]',
    '[data-testid="chat-message-content"]',
    '[data-testid="message-content"]',
    '[data-testid="assistant-message"]'
  ],
  done: [
    '[data-testid="action-bar"]',
    '[data-testid="copy-button"]',
    'button[aria-label*="Like" i]',
    'button[aria-label*="Thumbs up" i]'
  ]
};

export class CopilotGuestProvider extends WebProvider {
  constructor() {
    super('copilot-guest', 'Microsoft Copilot Guest');
    this.url = 'https://copilot.cloud.microsoft/';
    this.maxPromptChars = 9_000;
  }

  async probe(host) {
    await host.goto(this.url);
    const composer = await host.firstVisible(SELECTORS.composer);
    return {
      provider: this.id,
      ready: Boolean(composer),
      anonymousExpected: true,
      url: host.page.url(),
      reason: composer ? null : 'Copilot composer not found; guest access may be unavailable in this region/session or the UI changed.'
    };
  }

  async ask(host, prompt) {
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt must be a non-empty string');
    }
    if (prompt.length > this.maxPromptChars) {
      throw new Error(`Prompt too long for MVP (${prompt.length} > ${this.maxPromptChars})`);
    }

    if (!host.page || !host.page.url().includes('copilot')) {
      await host.goto(this.url);
    }

    const composer = await host.firstVisible(SELECTORS.composer);
    if (!composer) throw new Error('Copilot guest composer is not available');

    const before = await host.visibleTexts(SELECTORS.response);
    await host.setComposerText(composer, prompt.trim());

    const send = await host.firstVisible(SELECTORS.send);
    if (send) await send.click();
    else await composer.press('Enter');

    const startedAt = Date.now();
    const maxMs = 120_000;
    let lastText = '';
    let stableSince = 0;
    let sawNewResponse = false;

    while (Date.now() - startedAt < maxMs) {
      await host.page.waitForTimeout(350);

      const now = await host.visibleTexts(SELECTORS.response);
      const candidate = now.length > before.length ? now.at(-1) : now.at(-1) || '';
      if (candidate && candidate !== before.at(-1)) sawNewResponse = true;

      if (candidate !== lastText) {
        lastText = candidate;
        stableSince = Date.now();
      }

      const stop = await host.firstVisible(SELECTORS.stop);
      const doneSignal = await host.firstVisible(SELECTORS.done);
      const stableFor = stableSince ? Date.now() - stableSince : 0;

      if (sawNewResponse && lastText && !stop && (doneSignal || stableFor >= 1800)) {
        return {
          provider: this.id,
          text: lastText,
          elapsedMs: Date.now() - startedAt,
          transport: 'web-dom',
          authenticated: false
        };
      }
    }

    throw new Error(`Timed out waiting for Copilot response${lastText ? `; partial: ${lastText.slice(0, 200)}` : ''}`);
  }
}
