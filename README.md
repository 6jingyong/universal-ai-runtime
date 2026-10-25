# Universal AI Runtime

Early prototype for a user-authorized AI runtime that lets ordinary apps reuse AI access the user already has, with web sessions as the first transport.

The first MVP is intentionally narrow: determine whether a public AI web surface can act as a zero-config text backend without API keys, MCP, or private browser-cookie extraction.

## First live result: Copilot

As of the current E2E probe, `https://copilot.cloud.microsoft/` exposes a signed-out prompt box (`#unauth-prompt-input`), but submitting a prompt redirects to Microsoft OAuth sign-in. The runtime therefore classifies the current Copilot signed-out channel as:

```text
ui_available: true
auth_required: true
anonymous_chat: false
```

This is useful rather than a dead end: provider capability must be detected from live behavior instead of assumed from documentation or branding.

## Current prototype

```text
App / CLI
   ↓
CopilotGuestProvider
   ↓
Web Host
   ↓
copilot.cloud.microsoft
   ↓
capability probe
   ├─ anonymous response → anonymous_chat
   └─ OAuth redirect      → auth_required
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

If a system Chrome is available, set `CHROME_PATH` to avoid downloading another browser.

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

The E2E test opens the real public Copilot surface without authentication and classifies the live channel. `AUTH_REQUIRED` is a valid capability result; unexpected failures still store a screenshot, page HTML, URL, and title under `artifacts/`.

GitHub Actions runs the same live probe on pull requests using the runner's preinstalled Chrome.

## Deliberate non-goals for v0

- no account-cookie extraction;
- no API keys;
- no MCP;
- no tools or skills;
- no CAPTCHA or anti-abuse bypass;
- no attempt to disguise automation as a human browser.

## Next validation target

Add another signed-out provider, likely Gemini or ChatGPT, using the same `WebProvider` contract. A real anonymous response from a second provider would validate the positive zero-config path; Copilot already validates the `auth_required` capability path.

## License

MIT.
