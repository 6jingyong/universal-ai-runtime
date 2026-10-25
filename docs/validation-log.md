# Provider Validation Log

This file records every live Provider/Channel experiment, including failures. The goal is to preserve real behavior observed at the time of testing instead of relying on product documentation, visible UI, or assumptions.

## Recording rule

For every Provider/Channel attempt, record:

- date;
- provider and channel;
- target URL;
- environment / host;
- whether the page loads;
- whether an input surface is present;
- whether a real minimal prompt can be submitted;
- whether authentication is required;
- whether a model response is returned;
- relevant limits or UI details discovered;
- final capability classification;
- notes on whether the channel is worth further work.

Recommended capability values:

```text
anonymous_chat
account_required
blocked
unavailable
unknown
```

A failed experiment is still a useful result and should be committed.

A visible input surface does not count as anonymous inference. A channel is only classified `anonymous_chat` after a real prompt returns a real model response without authentication.

---

## 2026-10-26 — Mainstream signed-out web baseline

### Purpose

Find the lowest-friction web channel for the first Universal AI Runtime MVP. This is a screening pass, not an attempt to defeat provider-specific login, anti-bot, region, modal, or DOM behavior. If a provider does not work naturally in the generic probe, record the result and move on.

### Environment

- GitHub Actions Ubuntu runners;
- system Google Chrome 155;
- fresh browser context for each provider;
- no account, cookies, API key, MCP, or imported browser profile;
- no stealth / CAPTCHA bypass / anti-bot evasion;
- fixed prompt: `What is 137 + 286? Reply with digits only.`;
- expected response: `423`;
- generic DOM discovery only; no provider-specific repair during the baseline.

GitHub-hosted runners for this pass were located in several US Azure regions. Results therefore describe this clean automation environment, not every country, mobile WebView, or residential browser session.

### Results

| Provider | Signed-out surface | Prompt attempt | Observed result | Reviewed classification | MVP priority |
| --- | --- | --- | --- | --- | --- |
| Gemini | input found | submitted | returned `423` and opened a normal conversation URL | `anonymous_chat` | **A — first choice** |
| Qwen | input found | submitted | age-confirmation modal appeared (`Confirm your age to continue`, birth year selector) | `unknown` / age gate | **B — promising second candidate** |
| Meta AI | input found | submitted | birthday / age-confirmation modal appeared | `unknown` / age gate | B — optional follow-up |
| ChatGPT | no usable input reached | not submitted | challenge page titled `Just a moment...` | `blocked` in this automation environment | C — do not fight for anonymous MVP |
| Claude | no usable input reached | not submitted | challenge page titled `Just a moment...` | `blocked` in this automation environment | C |
| Mistral Vibe | no usable input reached | not submitted | challenge page titled `Just a moment...` | `blocked` in this automation environment | C |
| Grok | input found | submitted | login required before a model answer | `account_required` | C — account channel later |
| Microsoft Copilot | input found | submitted | redirected to Microsoft OAuth sign-in | `account_required` | C — account channel later |
| Perplexity | input found | submitted | created a search URL, then required login before observed answer | `account_required` | C — account channel later |
| Poe | no chat input before login | not submitted | redirected to `/login?redirect_url=%2F` | `account_required` | C — OAuth/account route is more relevant |
| Kimi | input found | submitted | login modal appeared (WeChat QR / phone / SSO) | `account_required` | C — account channel later |
| Tencent Yuanbao | input found | interaction attempted | login modal appeared (WeChat / phone / QQ) and intercepted the composer | `account_required` | C — account channel later |
| Z.ai | input found | submitted | conversation URL created, then generic block indicator observed | `blocked` | C |
| DeepSeek | no usable input reached | not submitted | page title `ERROR: The request could not be satisfied` | `blocked` / unavailable from runner | C |
| Doubao | no usable input reached | not submitted | redirected to `/security/doubao-region-ban?source=1` | `blocked` by region | C |
| MiniMax Agent | input found | not submitted | first-party update modal intercepted the composer; generic probe did not dismiss it | `unavailable` in baseline | C — not worth prioritizing |

### Strong positive: Gemini

Gemini was the only provider in this first no-special-casing pass that completed the full anonymous inference loop:

```text
fresh browser
→ gemini.google.com
→ visible composer
→ submit fixed prompt
→ model returns 423
→ no login
```

Observed result:

```text
page_load: true
input_surface: true
prompt_submit: true
auth_required: false
model_response: true
capability: anonymous_chat
```

This is sufficient to validate the central MVP hypothesis: an ordinary application can, at least for one mainstream provider, use a zero-account official web surface as a text inference channel.

### Qwen note

Qwen remains interesting despite the generic probe ending as `unknown`. The prompt surface loaded and accepted the prompt, but the site then displayed a normal first-party age-confirmation dialog asking for a birth year. This is not a CAPTCHA, anti-bot challenge, or login wall. Under the project's no-fighting rule, the baseline did not add Qwen-specific logic to complete the dialog.

Decision: keep Qwen as the most interesting candidate after Gemini, but do not call it a confirmed anonymous backend until a later shallow test completes the age gate and receives a model answer.

### Kimi and Yuanbao note

Both looked superficially usable while signed out, but interaction exposed normal login dialogs. Screenshot review clarified the generic `unknown` / modal-intercept behavior:

- Kimi: WeChat QR login, phone-number login, and SSO;
- Yuanbao: WeChat, phone, and QQ login.

Treat these as account channels rather than anonymous MVP candidates.

### Challenge-page note

ChatGPT, Claude, and Mistral returned `Just a moment...` challenge pages to the clean GitHub runner. This does not prove that ordinary residential users can never use their signed-out products; it means these sites are not low-friction anonymous automation targets in this environment. Do not invest in bypassing the challenge for the MVP.

### Selection decision

For the first working anonymous Web Adapter:

1. **Gemini first** — already proven end-to-end with no provider-specific repair.
2. **Qwen second only if we want another anonymous provider** — the only observed obstacle is a normal age-confirmation gate, but anonymous inference is not yet proven.
3. Do not spend MVP time fighting challenge pages, regional blocks, forced-login flows, or promotional/update overlays.
4. Providers classified `account_required` remain useful later when the Runtime adds user-authorized account sessions; they are not failures of the broader architecture.

### Architecture lesson

Provider capability must be discovered from live behavior, not inferred from branding, product documentation, or the presence of a composer. The Runtime should be comfortable returning states such as `anonymous_chat`, `account_required`, `blocked`, and `unavailable`, then route to whichever low-friction channel actually works.

---

## 2026-10-26 — Microsoft Copilot signed-out web

**Provider:** Microsoft Copilot  
**Channel:** Web / signed-out  
**Target:** `https://copilot.cloud.microsoft/`  
**Host:** GitHub Actions, Ubuntu runner, system Google Chrome driven through Playwright  
**Authentication before test:** none

### Observed behavior

- The signed-out page loaded successfully.
- A visible prompt surface was present.
- The current signed-out input element was identified as `#unauth-prompt-input`.
- The corresponding submit control was identified as `#unauth-prompt-submit`.
- The signed-out input surface exposed an approximately 2000-character limit; the MVP keeps a conservative 1900-character limit.
- A real minimal prompt was entered and submitted.
- Submission did **not** start an anonymous model response.
- The browser was redirected to `login.microsoftonline.com/.../authorize`.
- The runtime correctly classified this as `AUTH_REQUIRED`.

### Result

```text
page_load: true
input_surface: true
prompt_submit: true
auth_required: true
model_response: false
capability: account_required
```

### Decision

Do not spend more effort trying to turn this specific signed-out surface into an anonymous backend. Keep the adapter/probe as a regression and capability-detection example, but move validation effort to lower-friction providers.

### Architecture lesson

A visible prompt box is not sufficient evidence that a provider offers anonymous inference. Capability detection must exercise a minimal real request and classify the result from observed behavior.
