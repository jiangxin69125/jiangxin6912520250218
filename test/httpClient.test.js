const assert = require('node:assert/strict');
const test = require('node:test');

const {
  OutboundHttpError,
  fetchJson,
  isBlockedHostname,
  parseAllowedHosts,
  parseTimeoutMs,
  validateOutboundUrl,
} = require('../lib/httpClient');

test('parseAllowedHosts trims and lowercases comma-separated hosts', () => {
  assert.deepEqual(parseAllowedHosts(' API.Example.com, example.com:8443, '), [
    'api.example.com',
    'example.com:8443',
  ]);
});

test('parseTimeoutMs rejects unsafe timeout values', () => {
  assert.throws(() => parseTimeoutMs('50'), OutboundHttpError);
  assert.throws(() => parseTimeoutMs('90000'), OutboundHttpError);
  assert.equal(parseTimeoutMs('1000'), 1000);
});

test('validateOutboundUrl blocks local and unlisted hosts', () => {
  assert.throws(() => validateOutboundUrl('http://localhost:3000', ['localhost:3000']), OutboundHttpError);
  assert.throws(() => validateOutboundUrl('https://example.org', ['api.example.com']), OutboundHttpError);
  assert.equal(validateOutboundUrl('https://api.example.com/v1', ['api.example.com']).hostname, 'api.example.com');
});

test('isBlockedHostname detects common local and private targets', () => {
  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('127.0.0.1'), true);
  assert.equal(isBlockedHostname('192.168.1.10'), true);
  assert.equal(isBlockedHostname('api.example.com'), false);
});

test('fetchJson serializes JSON requests and parses JSON responses', async () => {
  const originalFetch = global.fetch;

  global.fetch = async (url, options) => {
    assert.equal(url.href, 'https://api.example.com/v1/check');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'application/json');
    assert.equal(options.body, '{"ok":true}');

    return {
      ok: true,
      status: 200,
      json: async () => ({ received: true }),
    };
  };

  try {
    const result = await fetchJson('https://api.example.com/v1/check', {
      method: 'POST',
      body: { ok: true },
      allowedHosts: ['api.example.com'],
      timeoutMs: 1000,
    });

    assert.deepEqual(result, { received: true });
  } finally {
    global.fetch = originalFetch;
  }
});
