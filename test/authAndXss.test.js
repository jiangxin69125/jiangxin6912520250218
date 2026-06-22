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

async function login(baseUrl) {
  const tokenResponse = await fetch(`${baseUrl}/csrf-token`, {
    headers: { accept: 'application/json' },
  });
  const csrfCookies = parseSetCookie(tokenResponse.headers);
  const { csrfToken } = await tokenResponse.json();

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: csrfCookies,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ username: 'admin', password: 'password' }),
  });

  assert.equal(loginResponse.status, 200);
  return {
    csrfToken,
    cookie: [csrfCookies, parseSetCookie(loginResponse.headers)].filter(Boolean).join('; '),
  };
}

test('demo page redirects unauthenticated users to login', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/demo`, {
      redirect: 'manual',
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/');
  } finally {
    server.close();
  }
});

test('echo requires login and rejects unauthenticated csrf requests', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const tokenResponse = await fetch(`${baseUrl}/csrf-token`);
    const cookie = parseSetCookie(tokenResponse.headers);
    const { csrfToken } = await tokenResponse.json();

    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ message: 'blocked' }),
    });

    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('authenticated echo keeps xss payload as inert text data', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const { csrfToken, cookie } = await login(baseUrl);
    const payload = '<img src=x onerror=alert(1)><script>alert(1)</script>';

    const response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ message: payload }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { message: payload });
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  } finally {
    server.close();
  }
});
