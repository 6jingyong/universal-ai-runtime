# Universal AI Runtime

Early prototype for a user-authorized AI runtime that lets ordinary apps reuse AI access the user already has, with official web sessions as the first transport.

The first MVP is deliberately narrow: provide a zero-API-key text backend without importing private browser cookies, requiring MCP, or fighting anti-bot systems.

## v0 scope

```text
China Mainland  → Qwen persistent account web
Global          → Gemini anonymous web
```

This is a product default, not a hard geo lock. The caller can explicitly override the provider.

Gemini has already completed a real signed-out end-to-end inference on a fresh GitHub Actions Chrome session.

Qwen signed-out web was tested and then deliberately deferred: after the age gate it showed another welcome/login onboarding modal and the prompt never reached the model. Rather than keep adding site-specific onboarding logic, the China path now uses a persistent isolated Qwen browser profile. The user signs in once on the official Qwen page and the runtime reuses that profile on later runs.

## Runtime shape

```text
App
 ↓
AIRuntime.ask(prompt)
 ↓
region / explicit provider
 ├─ global → GeminiGuestProvider
 └─ cn     → QwenAccountProvider
 ↓
Web Host
 ├─ ephemeral browser context (Gemini guest)
 └─ persistent isolated profile (Qwen account)
 ↓
official provider web page
```

The runtime never asks for a Qwen password, API key, or cookie export. Authentication is completed by the user on the official page inside the isolated profile.

Provider semantics and browser mechanics remain separate so the same provider logic can later be reused across desktop Playwright/CDP, browser-extension hosts, Android WebView, and iOS WKWebView.

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

The Qwen route opens a visible persistent browser by default. On first use, sign in on the official Qwen page. The profile is stored under `.ai-runtime/qwen/` unless `AI_PROFILE_DIR` overrides it.

Explicit override:

```bash
npm run probe -- --provider=qwen "你好"
npm run probe -- --provider=gemini "hello"
```

If a system Chrome is available, set `CHROME_PATH` to avoid downloading another browser.

## Tests

```bash
npm run check
npm test
TARGET=gemini npm run test:e2e
npm run test:account:e2e
```

Pull requests automatically run the real anonymous E2E for Gemini and a separate Qwen account-session substrate test. The Qwen account test does not use credentials; it verifies signed-out `login_required` detection and that the isolated browser profile preserves Qwen site state across restarts.

The broad 16-provider survey, Copilot regression, and anonymous Qwen experiment remain research evidence rather than normal development gates.

Diagnostics are stored under `artifacts/` when a live E2E fails.

## Validation rule

A visible prompt box is not evidence of usable inference. A channel only counts as working after a real prompt receives a real model response under that channel's intended authentication state.

Every Provider/Channel experiment — including failures — is recorded under `docs/`.

## Deliberate non-goals for v0

- no API keys;
- no MCP;
- no importing cookies from the user's main browser;
- no CAPTCHA or anti-abuse bypass;
- no stealth automation;
- no tools or skills yet;
- no attempt to support every model provider.

## License

MIT.
