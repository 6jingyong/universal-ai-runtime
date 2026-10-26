import { QwenGuestProvider } from './qwen-guest.js';

const INPUT_SELECTORS = [
  'textarea.message-input-textarea',
  'textarea[placeholder*="Ask Qwen" i]',
  'textarea'
];

export class QwenAccountProvider extends QwenGuestProvider {
  constructor() {
    super();
    this.id = 'qwen-account';
    this.label = 'Qwen Account';
  }

  async probe(host) {
    await host.goto(this.url);
    await host.page.waitForTimeout(1800);

    const input = await host.firstVisible(INPUT_SELECTORS);
    const loginText = host.page.getByText(/^log in$/i).last();
    const signUpText = host.page.getByText(/^sign up$/i).last();
    const loginVisible = await loginText.isVisible().catch(() => false);
    const signUpVisible = await signUpText.isVisible().catch(() => false);

    if (loginVisible || signUpVisible) {
      return {
        provider: this.id,
        ready: false,
        capability: 'login_required',
        url: host.page.url()
      };
    }

    return {
      provider: this.id,
      ready: Boolean(input),
      capability: input ? 'account_session' : 'unavailable',
      url: host.page.url()
    };
  }

  async ask(host, prompt) {
    const result = await super.ask(host, prompt);
    return {
      ...result,
      provider: this.id,
      channel: 'account_web'
    };
  }
}
