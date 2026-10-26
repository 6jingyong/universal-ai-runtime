# China account-session provider selection — 2026-10-26

## Goal

Choose the least-friction China Mainland provider for the first user-authorized account-session path after deferring anonymous Qwen onboarding.

Candidates reviewed:

- Qwen
- Kimi
- Tencent Yuanbao

## Decision

**Use Qwen first for the account-session MVP.**

This does not mean Qwen has the easiest signed-out flow; the signed-out flow was explicitly deferred after multiple onboarding layers. The account-session choice is based on the normal logged-in chat surface and the amount of existing selector evidence we already have.

### Qwen

Pros:

- current chat composer has a simple textarea-based structure;
- assistant responses have stable message / markdown containers in recent live-tested browser bridges;
- the existing anonymous experiment already established the current entry URL and basic composer semantics;
- a one-time login should remove the age/welcome onboarding path that made the anonymous route unattractive.

Risk:

- we have not yet completed a real authenticated turn in this repository because CI has no user credentials.

### Kimi

Pros:

- official Kimi browser extension explicitly supports signing in to a Kimi account and chatting from the browser;
- browser/account usage is clearly a first-party supported product flow.

Why not first:

- the web chat DOM has had more complex response-structure changes;
- recent browser-bridge evidence also documents intermittent capacity refusal / stalled turns;
- this makes it less attractive than Qwen for the smallest account-session MVP.

### Tencent Yuanbao

Pros:

- straightforward first-party login choices: WeChat, phone, and QQ;
- strong fit for Mainland users.

Why not first:

- we currently have much less mature browser-adapter evidence for the post-login chat DOM than for Qwen;
- choosing it now would add more discovery work before validating the account-session architecture itself.

## Architecture consequence

The runtime now uses:

```text
Global         → Gemini anonymous web
China Mainland → Qwen persistent account web
```

The China path uses an isolated persistent browser profile. The user logs in only on the official Qwen page; the runtime does not ask for or store a password, API key, or imported main-browser cookie.

CI can validate the persistence substrate and the signed-out `login_required` state, but cannot honestly claim an authenticated model turn until a real user completes login in that isolated profile.
