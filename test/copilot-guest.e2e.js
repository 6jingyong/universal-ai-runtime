import assert from 'node:assert/strict';
import { PlaywrightHost } from '../src/hosts/playwright-host.js';
import { CopilotGuestProvider } from '../src/providers/copilot-guest.js';

const host = new PlaywrightHost({ headless: true, timeoutMs: 45_000 });
const provider = new CopilotGuestProvider();
const expected = 'COPILOT_GUEST_OK';

try {
  await host.start();
  const probe = await provider.probe(host);
  console.log('probe:', JSON.stringify(probe, null, 2));
  assert.equal(probe.ready, true, probe.reason || 'Copilot Guest is not ready');

  const result = await provider.ask(host, `Reply with exactly: ${expected}`);
  console.log('response:', result.text);
  console.log('meta:', JSON.stringify(result, null, 2));

  assert.ok(result.text.includes(expected), `Expected response to contain ${expected}`);
  assert.equal(result.authenticated, false);
  assert.equal(result.transport, 'web-dom');
} catch (error) {
  await host.saveDiagnostics('artifacts/copilot-guest');
  throw error;
} finally {
  await host.close();
}
