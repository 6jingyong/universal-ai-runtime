# Universal AI Runtime

Early prototype for a user-authorized AI runtime that lets ordinary apps reuse AI access the user already has, with web sessions as the first transport.

The first MVP is deliberately narrow: provide a zero-API-key text backend from official AI web surfaces, without importing private browser cookies, requiring MCP, or fighting anti-bot systems.

## v0 scope

Only two anonymous web providers are active candidates:

```text
China Mainland  → Qwen Web
Global          → Gemini Web
```

This is a product default, not a hard geo lock. The caller can explicitly override the provider.

Gemini has already completed a real signed-out end-to-end inference on a fresh GitHub Actions Chrome session. Qwen passed the generic signed-out surface test but showed a normal first-party age-confirmation dialog; the dedicated adapter handles that shallow gate and the live E2E workflow now tests it directly.

Other providers remain in the validation log as research evidence, but they are not part of the v0 runtime path.

## Runtime shape

```text
App
 ↓
AIRuntime.ask(prompt)
 ↓
region / explicit provider
 ├─ global → GeminiGuestProvider
 └─ cn     → QwenGuestProvider
 ↓
Web Host
 ↓
official provider web page
```

Provider semantics and browser mechanics remain separate so the same provider logic can later be reused across:

- desktop Playwright/CDP hosts;
- browser-extension hosts;
- Android WebView;
- iOS WKWebView.

## Run locally

Requires Node.js 20+.

```bash
npm install
npx playwright install chromium
npm test
```

Global / Gemini:

```bash
npm run probe -- --region=global "What is 137 + 286?"
```

China Mainland / Qwen:

```bash
npm run probe -- --region=cn "137 + 286 等于多少？只回答数字。"
```

Explicit override:

```bash
npm run probe -- --provider=qwen "你好"
npm run probe -- --provider=gemini "hello"
```

If a system Chrome is available, set `CHROME_PATH` to avoid downloading another browser. Set `HEADLESS=0` to show the browser.

## Tests

```bash
npm run check
npm test
TARGET=gemini npm run test:e2e
TARGET=qwen npm run test:e2e
```

Pull requests automatically run the real anonymous E2E only for Gemini and Qwen. The broad 16-provider survey and the Copilot regression probe remain available as manual workflows rather than running on every change.

Diagnostics are stored under `artifacts/` when a live E2E fails.

## Validation rule

A visible prompt box is not evidence of anonymous inference. A channel only counts as working after a real prompt receives a real model response without authentication.

Every Provider/Channel experiment — including failures — is recorded in `docs/validation-log.md`.

## Deliberate non-goals for v0

- no API keys;
- no MCP;
- no account-cookie extraction;
- no CAPTCHA or anti-abuse bypass;
- no stealth automation;
- no tools or skills yet;
- no attempt to support every model provider.

## License

MIT.
