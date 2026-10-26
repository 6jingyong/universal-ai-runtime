import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PersistentPlaywrightHost } from '../src/hosts/persistent-playwright-host.js';
import { QwenAccountProvider } from '../src/providers/qwen-account.js';

const artifactDir = path.join('artifacts', 'account-session', 'qwen');
const profileDir = path.join(artifactDir, 'profile');
const markerKey = '__uar_profile_probe';
const markerValue = 'persisted';
const provider = new QwenAccountProvider();

await fs.rm(artifactDir, { recursive: true, force: true });

let firstHost;
let secondHost;
const summary = {
  testedAt: new Date().toISOString(),
  firstProbe: null,
  profilePersisted: false,
  secondProbe: null,
  error: null
};

try {
  firstHost = new PersistentPlaywrightHost({ profileDir, headless: true, timeoutMs: 15_000 });
  await firstHost.start();
  summary.firstProbe = await provider.probe(firstHost);
  assert.equal(summary.firstProbe.capability, 'login_required', `Expected signed-out Qwen to require login: ${JSON.stringify(summary.firstProbe)}`);
  await firstHost.page.evaluate(([key, value]) => localStorage.setItem(key, value), [markerKey, markerValue]);
  await firstHost.close();
  firstHost = null;

  secondHost = new PersistentPlaywrightHost({ profileDir, headless: true, timeoutMs: 15_000 });
  await secondHost.start();
  await secondHost.goto('https://chat.qwen.ai/');
  const restored = await secondHost.page.evaluate((key) => localStorage.getItem(key), markerKey);
  summary.profilePersisted = restored === markerValue;
  assert.equal(summary.profilePersisted, true, 'Persistent browser profile did not retain Qwen site storage across restart');
  summary.secondProbe = await provider.probe(secondHost);
  assert.equal(summary.secondProbe.capability, 'login_required', `Expected account state to remain signed out in CI: ${JSON.stringify(summary.secondProbe)}`);

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  summary.error = `${error?.name || 'Error'}: ${error?.message || error}`;
  if (firstHost) await firstHost.saveDiagnostics(artifactDir);
  if (secondHost) await secondHost.saveDiagnostics(artifactDir);
  console.error(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, 'result.json'), JSON.stringify(summary, null, 2), 'utf8');
  await firstHost?.close().catch(() => {});
  await secondHost?.close().catch(() => {});
}
