import path from 'node:path';
import { PlaywrightHost } from './hosts/playwright-host.js';
import { PersistentPlaywrightHost } from './hosts/persistent-playwright-host.js';
import { AIRuntime, providerForRegion } from './runtime.js';

const args = process.argv.slice(2);
const prompt = args.filter((arg) => !arg.startsWith('--')).join(' ').trim() || 'What is 137 + 286? Reply with digits only.';
const providerArg = args.find((arg) => arg.startsWith('--provider='));
const regionArg = args.find((arg) => arg.startsWith('--region='));
const provider = providerArg?.split('=')[1] || process.env.PROVIDER || 'auto';
const region = regionArg?.split('=')[1] || process.env.REGION || 'global';
const selected = provider === 'auto' ? providerForRegion(region) : provider;
const headless = process.env.HEADLESS == null ? selected !== 'qwen' : process.env.HEADLESS !== '0';

const host = selected === 'qwen'
  ? new PersistentPlaywrightHost({
      profileDir: process.env.AI_PROFILE_DIR || path.resolve('.ai-runtime/qwen'),
      headless
    })
  : new PlaywrightHost({ headless });
const runtime = new AIRuntime({ host, region, provider });

try {
  await host.start();
  console.log('route:', JSON.stringify({ region, provider, selected: runtime.selectedProviderId() }, null, 2));
  const result = await runtime.ask(prompt);
  console.log('\nresponse:\n', result.text);
  console.log('\nmeta:', JSON.stringify({
    provider: result.provider,
    channel: result.channel,
    elapsedMs: result.elapsedMs,
    transport: result.transport
  }, null, 2));
} catch (err) {
  await host.saveDiagnostics();
  if (err?.code === 'LOGIN_REQUIRED' && selected === 'qwen') {
    console.error('\nQwen login required. A persistent official Qwen browser profile has been opened; log in there once, then run the same command again.');
  } else {
    console.error('\nRuntime failed:', err?.stack || err);
  }
  process.exitCode = 1;
} finally {
  await host.close();
}
