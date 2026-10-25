/**
 * Smallest contract every anonymous Web Adapter must satisfy.
 *
 * Providers know website semantics. Hosts know browser mechanics. This keeps
 * Copilot/Gemini/etc. reusable across desktop Playwright and future mobile
 * WebView/WKWebView hosts.
 */
export class WebProvider {
  constructor(id, label) {
    this.id = id;
    this.label = label;
  }

  async probe(_host) {
    throw new Error('probe() not implemented');
  }

  async ask(_host, _prompt) {
    throw new Error('ask() not implemented');
  }
}
