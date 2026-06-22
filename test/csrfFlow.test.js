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

test('serves browser login page', async () => {
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Login required/);
  } finally {
    server.close();
  }
});

test('csrf token cookie and header allow authenticated echo requests', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const { csrfToken, cookie } = await login(baseUrl);
    assert.ok(csrfToken);
    assert.match(cookie, /x-csrf-session=/);
    assert.match(cookie, /x-csrf-token=/);
    assert.match(cookie, /demo-session=/);

    const echoResponse = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({ message: 'Manual flow works' }),
    });
    const echoBody = await echoResponse.json();

    assert.equal(echoResponse.status, 200);
    assert.deepEqual(echoBody, { message: 'Manual flow works' });
  } finally {
    server.close();
  }
});
