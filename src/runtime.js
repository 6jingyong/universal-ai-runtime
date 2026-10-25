import { GeminiGuestProvider } from './providers/gemini-guest.js';
import { QwenGuestProvider } from './providers/qwen-guest.js';

const DEFAULT_PROVIDERS = {
  gemini: new GeminiGuestProvider(),
  qwen: new QwenGuestProvider()
};

export function providerForRegion(region = 'global') {
  const normalized = String(region).toLowerCase();
  if (['cn', 'china', 'china-mainland', 'mainland'].includes(normalized)) return 'qwen';
  return 'gemini';
}

export class AIRuntime {
  constructor({ host, region = 'global', provider = 'auto', providers = DEFAULT_PROVIDERS } = {}) {
    if (!host) throw new Error('AIRuntime requires a host');
    this.host = host;
    this.region = region;
    this.provider = provider;
    this.providers = providers;
  }

  selectedProviderId() {
    return this.provider === 'auto' ? providerForRegion(this.region) : this.provider;
  }

  selectedProvider() {
    const id = this.selectedProviderId();
    const provider = this.providers[id];
    if (!provider) throw new Error(`Unknown provider: ${id}`);
    return provider;
  }

  async probe() {
    return this.selectedProvider().probe(this.host);
  }

  async ask(prompt) {
    const provider = this.selectedProvider();
    const probe = await provider.probe(this.host);
    if (!probe.ready) {
      const error = new Error(`${provider.label} is not ready: ${probe.capability}`);
      error.code = 'PROVIDER_NOT_READY';
      error.probe = probe;
      throw error;
    }
    return provider.ask(this.host, prompt);
  }
}
