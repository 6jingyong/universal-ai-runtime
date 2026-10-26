import assert from 'node:assert/strict';
import { AIRuntime, providerForRegion } from '../src/runtime.js';

assert.equal(providerForRegion('global'), 'gemini');
assert.equal(providerForRegion('jp'), 'gemini');
assert.equal(providerForRegion('cn'), 'qwen');
assert.equal(providerForRegion('china-mainland'), 'qwen');

const calls = [];
const providers = {
  gemini: {
    label: 'Gemini',
    async probe() { calls.push('gemini:probe'); return { ready: true, capability: 'anonymous_chat' }; },
    async ask(_host, prompt) { calls.push(`gemini:ask:${prompt}`); return { provider: 'gemini-guest', text: 'G' }; }
  },
  qwen: {
    label: 'Qwen',
    async probe() { calls.push('qwen:probe'); return { ready: true, capability: 'anonymous_chat' }; },
    async ask(_host, prompt) { calls.push(`qwen:ask:${prompt}`); return { provider: 'qwen-guest', text: 'Q' }; }
  }
};

const fakeHost = {};
const globalRuntime = new AIRuntime({ host: fakeHost, region: 'global', providers });
assert.equal((await globalRuntime.ask('hello')).text, 'G');

const cnRuntime = new AIRuntime({ host: fakeHost, region: 'cn', providers });
assert.equal((await cnRuntime.ask('你好')).text, 'Q');

const overrideRuntime = new AIRuntime({ host: fakeHost, region: 'cn', provider: 'gemini', providers });
assert.equal((await overrideRuntime.ask('override')).text, 'G');

assert.deepEqual(calls, [
  'gemini:probe', 'gemini:ask:hello',
  'qwen:probe', 'qwen:ask:你好',
  'gemini:probe', 'gemini:ask:override'
]);

console.log('runtime.unit: ok');
