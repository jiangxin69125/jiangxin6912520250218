const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonOutput = process.argv.includes('--json');

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function hasLine(relativePath, expectedLine) {
  if (!exists(relativePath)) {
    return false;
  }

  return fs
    .readFileSync(path.join(root, relativePath), 'utf8')
    .split(/\r?\n/)
    .includes(expectedLine);
}

function hasMajorVersionAtLeast(version, minimumMajor) {
  const major = Number(version.replace(/^v/, '').split('.')[0]);
  return Number.isInteger(major) && major >= minimumMajor;
}

const packageJson = readJson('package.json');
const dependencies = packageJson.dependencies || {};
const scripts = packageJson.scripts || {};

const checks = [
  {
    name: 'package.json exists',
    ok: exists('package.json'),
  },
  {
    name: 'package-lock.json exists',
    ok: exists('package-lock.json'),
  },
  {
    name: '.env.example exists',
    ok: exists('.env.example'),
  },
  {
    name: 'SECURITY.md exists',
    ok: exists('SECURITY.md'),
  },
  {
    name: 'project decisions are documented',
    ok: exists('docs/PROJECT_DECISIONS.md'),
  },
  {
    name: 'source provenance is documented',
    ok: exists('docs/SOURCE_PROVENANCE.md'),
  },
  {
    name: '.gitignore ignores node_modules',
    ok: hasLine('.gitignore', 'node_modules/'),
  },
  {
    name: '.gitignore ignores local env files',
    ok: hasLine('.gitignore', '.env'),
  },
  {
    name: 'helmet dependency installed',
    ok: Boolean(dependencies.helmet),
  },
  {
    name: 'express-rate-limit dependency installed',
    ok: Boolean(dependencies['express-rate-limit']),
  },
  {
    name: 'csrf-csrf dependency installed',
    ok: Boolean(dependencies['csrf-csrf']),
  },
  {
    name: 'cookie-parser dependency installed',
    ok: Boolean(dependencies['cookie-parser']),
  },
  {
    name: 'Node.js supports global fetch',
    ok: hasMajorVersionAtLeast(process.version, 18),
  },
  {
    name: 'test script runs node test runner',
    ok: typeof scripts.test === 'string' && scripts.test.startsWith('node --test'),
  },
  {
    name: 'audit script checks production dependencies',
    ok: scripts.audit === 'node scripts/audit.js',
  },
  {
    name: 'check script avoids nested npm calls',
    ok: scripts.check === 'node scripts/audit.js && node scripts/doctor.js --json',
  },
  {
    name: 'audit wrapper exists',
    ok: exists('scripts/audit.js'),
  },
  {
    name: 'outbound HTTP helper exists',
    ok: exists('lib/httpClient.js'),
  },
  {
    name: 'outbound HTTP tests exist',
    ok: exists('test/httpClient.test.js'),
  },
  {
    name: '.env.example documents outbound allowlist',
    ok: hasLine('.env.example', 'OUTBOUND_HTTP_ALLOWED_HOSTS=api.example.com'),
  },
  {
    name: '.env.example documents outbound timeout',
    ok: hasLine('.env.example', 'OUTBOUND_HTTP_TIMEOUT_MS=5000'),
  },
];

const result = {
  ok: checks.every((check) => check.ok),
  checks,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const check of checks) {
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
  }
}

process.exitCode = result.ok ? 0 : 1;
