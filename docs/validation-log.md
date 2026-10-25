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
