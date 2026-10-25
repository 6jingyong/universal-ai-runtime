import { PlaywrightHost } from './hosts/playwright-host.js';
import { AIRuntime } from './runtime.js';

const args = process.argv.slice(2);
const prompt = args.filter((arg) => !arg.startsWith('--')).join(' ').trim() || 'What is 137 + 286? Reply with digits only.';
const providerArg = args.find((arg) => arg.startsWith('--provider='));
const regionArg = args.find((arg) => arg.startsWith('--region='));
const provider = providerArg?.split('=')[1] || process.env.PROVIDER || 'auto';
const region = regionArg?.split('=')[1] || process.env.REGION || 'global';
const headless = process.env.HEADLESS !== '0';

const host = new PlaywrightHost({ headless });
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
  console.error('\nRuntime failed:', err?.stack || err);
  process.exitCode = 1;
} finally {
  await host.close();
}
