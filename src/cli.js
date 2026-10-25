import { PlaywrightHost } from './hosts/playwright-host.js';
import { CopilotGuestProvider } from './providers/copilot-guest.js';

const prompt = process.argv.slice(2).join(' ').trim() || 'Reply with exactly: COPILOT_GUEST_OK';
const headless = process.env.HEADLESS !== '0';
const host = new PlaywrightHost({ headless });
const provider = new CopilotGuestProvider();

try {
  await host.start();
  const probe = await provider.probe(host);
  console.log('probe:', JSON.stringify(probe, null, 2));

  if (!probe.ready) {
    await host.saveDiagnostics();
    process.exitCode = 2;
  } else {
    const result = await provider.ask(host, prompt);
    console.log('\nresponse:\n', result.text);
    console.log('\nmeta:', JSON.stringify({ elapsedMs: result.elapsedMs, transport: result.transport }, null, 2));
  }
} catch (err) {
  await host.saveDiagnostics();
  console.error('\nMVP failed:', err?.stack || err);
  process.exitCode = 1;
} finally {
  await host.close();
}
