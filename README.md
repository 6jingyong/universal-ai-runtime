# Universal AI Runtime

Early prototype for a user-authorized AI runtime that lets ordinary apps reuse AI access the user already has, starting with anonymous web AI.

The first MVP is intentionally narrow: prove that an app can treat the public Microsoft Copilot web UI as a zero-config text backend without accounts, API keys, MCP, or private browser cookies.

## Current MVP

```text
App / CLI
   ↓
CopilotGuestProvider
   ↓
Web Host
   ↓
copilot.microsoft.com
   ↓
anonymous prompt + response
```

The provider and browser host are separate on purpose. Provider semantics should later be reusable across:

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
npm run probe -- "Reply with exactly: COPILOT_GUEST_OK"
```

By default the probe is headless. Use a visible browser with:

```bash
HEADLESS=0 npm run probe -- "Reply with exactly: COPILOT_GUEST_OK"
```

## Tests

```bash
npm run check
npm test
npm run test:e2e
```

The E2E test opens the real public Copilot website without authentication. On failure it stores a screenshot, page HTML, URL, and title under `artifacts/`.

GitHub Actions runs the same E2E probe on pull requests. A failure can therefore mean either an adapter regression or a provider-side/network/anti-automation restriction; diagnostics are uploaded as a workflow artifact to distinguish those cases.

## Deliberate non-goals for v0

- no login or account-cookie extraction;
- no API keys;
- no MCP;
- no tools or skills;
- no CAPTCHA or anti-abuse bypass;
- no attempt to disguise automation as a human browser.

## Next validation target

If Copilot Guest works reliably, add a second anonymous provider such as Gemini Guest using the same `WebProvider` contract. That is the first real test that the abstraction is provider-independent.

## License

MIT.
