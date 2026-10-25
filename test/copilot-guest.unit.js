import assert from 'node:assert/strict';
import { CopilotGuestProvider } from '../src/providers/copilot-guest.js';

class MockLocator {
  constructor(kind, host) { this.kind = kind; this.host = host; }
  async click() { if (this.kind === 'send') this.host.sent = true; }
  async press(key) { if (key === 'Enter') this.host.sent = true; }
}

class MockHost {
  constructor() {
    this.tick = 0;
    this.prompt = '';
    this.sent = false;
    this.page = {
      url: () => 'https://copilot.cloud.microsoft/',
      title: async () => 'Copilot | AI chat for work',
      waitForTimeout: async () => { this.tick += 1; }
    };
  }
  async goto(url) { this.page.url = () => url; }
  async firstVisible(selectors) {
    const joined = selectors.join(' ');
    if (joined.includes('unauth-prompt-input') || joined.includes('userInput')) return new MockLocator('composer', this);
    if (joined.includes('unauth-prompt-submit') || joined.includes('submit-button')) return new MockLocator('send', this);
    if (joined.includes('stop-button')) return this.sent && this.tick < 3 ? new MockLocator('stop', this) : null;
    if (joined.includes('action-bar')) return this.sent && this.tick >= 3 ? new MockLocator('done', this) : null;
    return null;
  }
  async visibleTexts() {
    if (!this.sent) return [];
    if (this.tick === 0) return [];
    if (this.tick === 1) return ['COPILOT'];
    if (this.tick === 2) return ['COPILOT_GUEST'];
    return ['COPILOT_GUEST_OK'];
  }
  async setComposerText(_locator, text) { this.prompt = text; }
}

const provider = new CopilotGuestProvider();
const host = new MockHost();

const probe = await provider.probe(host);
assert.equal(probe.ready, true);
assert.equal(probe.provider, 'copilot-guest');

const result = await provider.ask(host, 'Reply with exactly: COPILOT_GUEST_OK');
assert.equal(host.prompt, 'Reply with exactly: COPILOT_GUEST_OK');
assert.equal(host.sent, true);
assert.equal(result.text, 'COPILOT_GUEST_OK');
assert.equal(result.transport, 'web-dom');
assert.equal(result.authenticated, false);

await assert.rejects(() => provider.ask(host, ''), /non-empty string/);
await assert.rejects(() => provider.ask(host, 'x'.repeat(provider.maxPromptChars + 1)), /Prompt too long/);

console.log('copilot-guest unit: PASS');
