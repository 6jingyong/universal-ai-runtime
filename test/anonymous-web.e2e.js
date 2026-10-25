import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PlaywrightHost } from '../src/hosts/playwright-host.js';
import { GeminiGuestProvider } from '../src/providers/gemini-guest.js';
import { QwenGuestProvider } from '../src/providers/qwen-guest.js';

const target = process.env.TARGET || 'gemini';
const providers = {
  gemini: new GeminiGuestProvider(),
  qwen: new QwenGuestProvider()
};

if (!providers[target]) throw new Error(`Unknown TARGET=${target}`);

const provider = providers[target];
const artifactDir = path.join('artifacts', 'anonymous-web', target);
const host = new PlaywrightHost({ headless: true, timeoutMs: 15_000 });
const summary = {
  target,
  provider: provider.id,
  testedAt: new Date().toISOString(),
  probe: null,
  result: null,
  error: null
};

try {
  await host.start();
  summary.probe = await provider.probe(host);
  assert.equal(summary.probe.ready, true, `${target} is not ready: ${JSON.stringify(summary.probe)}`);

  summary.result = await provider.ask(host, 'What is 137 + 286? Reply with digits only.');
  assert.match(summary.result.text, /(^|\D)423(\D|$)/, `${target} returned unexpected text: ${summary.result.text}`);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  summary.error = `${error?.name || 'Error'}: ${error?.message || error}`;
  await host.saveDiagnostics(artifactDir);
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, 'result.json'), JSON.stringify(summary, null, 2), 'utf8');
  await host.close();
}
