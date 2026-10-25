# Qwen signed-out Web E2E — 2026-10-26

## Goal

Validate whether Qwen can serve as the China Mainland zero-account Web Provider for the v0 runtime without provider-specific browser fighting.

## Environment

- GitHub Actions Ubuntu runner
- system Google Chrome 155
- fresh browser context
- no account or cookies
- no API key or MCP
- no anti-bot / CAPTCHA bypass
- fixed prompt: `What is 137 + 286? Reply with digits only.`

## What happened

The dedicated provider probe succeeded initially:

```text
ready: true
capability: anonymous_candidate
url: https://chat.qwen.ai/
```

The adapter already handled the first normal onboarding gate, `Confirm your age to continue`.

After that gate, Qwen displayed a second modal:

```text
Welcome to Qwen

Log in to unlock features like video generation,
get more generation credits, and sync your chat history.

[Log in]
[Sign up]
```

The modal has a close control, so this is not evidence that login is strictly mandatory. However, the original prompt remained in the composer and no model response was produced. The E2E timed out after 45 seconds.

Observed result:

```text
page_load: true
input_surface: true
initial_submit: true
age_gate: encountered / handled
second_welcome_modal: encountered
model_response: false
error: Timed out waiting for model response after 45000ms
```

## Decision

**Defer the Qwen anonymous channel.**

Continuing would require a Qwen-specific onboarding sequence such as:

```text
submit prompt
→ detect age gate
→ continue
→ detect welcome/login modal
→ dismiss it
→ inspect whether the prompt survived
→ submit again
→ handle any next transition
```

That is already beyond the project's low-friction rule for the first MVP. We do not need to prove that the page can eventually be automated.

This does **not** mean Qwen is unusable. It means Qwen signed-out Web is not currently a sufficiently clean zero-account transport for v0.

## Comparison

The same E2E workflow passed for Gemini without this onboarding chain. Gemini therefore remains the confirmed anonymous Provider.

## Next implication

For China Mainland, prefer evaluating a normal user-authorized **account session** rather than spending more effort on anonymous Qwen onboarding. A one-time official login inside a runtime-managed browser/WebView remains compatible with the project's no-API-key goal.
