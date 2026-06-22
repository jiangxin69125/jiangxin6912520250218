const assert = require('node:assert/strict');
const test = require('node:test');

const app = require('../server');

function parseSetCookie(headers) {
  const raw =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (headers.get('set-cookie') || '').split(/,\s*(?=[^;]+=)/);

  return raw.filter(Boolean).map((cookie) => cookie.split(';')[0]).join('; ');
}

async function withServer(run) {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function getCsrfToken(baseUrl) {
  const response = await fetch(`${baseUrl}/csrf-token`, {
    headers: { accept: 'application/json' },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal(typeof body.csrfToken, 'string');
  assert.notEqual(body.csrfToken.length, 0);

  return {
    csrfToken: body.csrfToken,
    cookie: parseSetCookie(response.headers),
  };
}

async function login(baseUrl) {
  const { csrfToken, cookie: csrfCookie } = await getCsrfToken(baseUrl);

  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: csrfCookie,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ username: 'admin', password: 'password' }),
  });

  assert.equal(response.status, 200);

  return {
    csrfToken,
    cookie: [csrfCookie, parseSetCookie(response.headers)].filter(Boolean).join('; '),
  };
}

test('server routes smoke test', async () => {
  await withServer(async (baseUrl) => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthBody = await healthResponse.json();

    assert.equal(healthResponse.status, 200);
    assert.deepEqual(healthBody, {
      ok: true,
      service: 'my-github-project',
      environment: process.env.NODE_ENV || 'development',
    });

    const { csrfToken, cookie } = await login(baseUrl);

    const echoResponse = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ message: 'route smoke test' }),
    });
    const echoBody = await echoResponse.json();

    assert.equal(echoResponse.status, 200);
    assert.deepEqual(echoBody, { message: 'route smoke test' });

    const missingTokenResponse = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ message: 'blocked' }),
    });
    const missingTokenBody = await missingTokenResponse.json();

    assert.equal(missingTokenResponse.status, 403);
    assert.deepEqual(missingTokenBody, { error: 'Invalid CSRF token' });
  });
});
