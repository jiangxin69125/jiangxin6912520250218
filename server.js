const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const csrfSecret = process.env.CSRF_SECRET || 'change-this-dev-only-secret';
const sessionCookieName = isProduction ? '__Host-demo-session' : 'demo-session';
const sessionMaxAgeMs = 2 * 60 * 60 * 1000;
const demoUsername = process.env.DEMO_USERNAME || 'admin';
const demoPassword = process.env.DEMO_PASSWORD || 'password';
const sessions = new Map();

if (isProduction && csrfSecret === 'change-this-dev-only-secret') {
  throw new Error('CSRF_SECRET must be set in production.');
}

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.csrfSessionId,
  cookieName: isProduction ? '__Host-x-csrf-token' : 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  },
});

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  const cookieName = isProduction ? '__Host-x-csrf-session' : 'x-csrf-session';
  const sessionId = req.cookies[cookieName] || crypto.randomUUID();

  req.csrfSessionId = sessionId;
  if (!req.cookies[cookieName]) {
    res.cookie(cookieName, sessionId, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      path: '/',
    });
  }

  next();
});
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(hash(left), hash(right));
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    username,
    expiresAt: Date.now() + sessionMaxAgeMs,
  });
  return token;
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function setSessionCookie(res, token) {
  res.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: sessionMaxAgeMs,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  });
}

function loadUser(req, res, next) {
  const token = req.cookies[sessionCookieName];
  const session = token ? getSession(token) : null;

  if (session) {
    req.user = {
      username: session.username,
      token,
    };
  }

  next();
}

function requireAuth(req, res, next) {
  if (req.user) {
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

function normalizeMessage(value) {
  if (typeof value !== 'string') {
    return 'Hello World!';
  }

  return value.trim().slice(0, 500) || 'Hello World!';
}

app.use(loadUser);

app.get('/', (req, res) => {
  if (req.user) {
    return res.redirect('/demo');
  }

  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/demo', (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }

  return res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

app.post('/login', doubleCsrfProtection, (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!safeEqual(username, demoUsername) || !safeEqual(password, demoPassword)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = createSession(username);
  setSessionCookie(res, token);
  return res.json({ ok: true, redirectTo: '/demo' });
});

app.post('/logout', requireAuth, doubleCsrfProtection, (req, res) => {
  sessions.delete(req.user.token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'my-github-project',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

app.post('/echo', requireAuth, doubleCsrfProtection, (req, res) => {
  res.json({ message: normalizeMessage(req.body.message) });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

function startServer() {
  return app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
