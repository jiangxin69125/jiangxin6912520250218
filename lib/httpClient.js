const net = require('net');

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_ERROR_BODY_LENGTH = 500;
const DEFAULT_BLOCKED_HOSTS = new Set(['localhost']);

class OutboundHttpError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'OutboundHttpError';
    Object.assign(this, details);
  }
}

function parseAllowedHosts(value = process.env.OUTBOUND_HTTP_ALLOWED_HOSTS || '') {
  return value
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function parseTimeoutMs(value = process.env.OUTBOUND_HTTP_TIMEOUT_MS) {
  if (!value) {
    return DEFAULT_TIMEOUT_MS;
  }

  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new OutboundHttpError('OUTBOUND_HTTP_TIMEOUT_MS must be an integer from 100 to 30000.');
  }

  return timeoutMs;
}

function isPrivateIPv4(hostname) {
  const parts = hostname.split('.').map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 0
  );
}

function isBlockedHostname(hostname) {
  const normalized = hostname.toLowerCase();
  const ipVersion = net.isIP(normalized);

  if (DEFAULT_BLOCKED_HOSTS.has(normalized) || normalized.endsWith('.localhost')) {
    return true;
  }

  if (ipVersion === 4) {
    return isPrivateIPv4(normalized);
  }

  if (ipVersion === 6) {
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd');
  }

  return false;
}

function matchesAllowedHost(url, allowedHosts) {
  const hostname = url.hostname.toLowerCase();
  const host = url.host.toLowerCase();

  return allowedHosts.some((allowedHost) => allowedHost === hostname || allowedHost === host);
}

function validateOutboundUrl(input, allowedHosts) {
  let url;

  try {
    url = new URL(input);
  } catch {
    throw new OutboundHttpError('Outbound URL is invalid.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new OutboundHttpError('Outbound URL must use http or https.');
  }

  if (isBlockedHostname(url.hostname)) {
    throw new OutboundHttpError('Outbound URL targets a blocked host.');
  }

  if (allowedHosts.length === 0 || !matchesAllowedHost(url, allowedHosts)) {
    throw new OutboundHttpError('Outbound URL host is not allowed.');
  }

  return url;
}

async function readErrorBody(response) {
  const text = await response.text();
  return text.slice(0, MAX_ERROR_BODY_LENGTH);
}

function buildJsonRequestOptions(options) {
  const headers = {
    accept: 'application/json',
    ...(options.headers || {}),
  };

  if (options.body !== undefined && !headers['content-type'] && !headers['Content-Type']) {
    headers['content-type'] = 'application/json';
  }

  return {
    ...options,
    headers,
    body: options.body === undefined || typeof options.body === 'string' ? options.body : JSON.stringify(options.body),
  };
}

async function fetchJson(input, options = {}) {
  if (typeof fetch !== 'function') {
    throw new OutboundHttpError('Global fetch is not available. Use Node.js 18 or newer.');
  }

  const allowedHosts = options.allowedHosts || parseAllowedHosts();
  const timeoutMs = options.timeoutMs || parseTimeoutMs();
  const url = validateOutboundUrl(input, allowedHosts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestOptions = buildJsonRequestOptions({
    method: 'GET',
    ...options,
    signal: controller.signal,
  });

  delete requestOptions.allowedHosts;
  delete requestOptions.timeoutMs;

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new OutboundHttpError(`Outbound request failed with HTTP ${response.status}.`, {
        status: response.status,
        body: await readErrorBody(response),
      });
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new OutboundHttpError('Outbound request timed out.', { timeoutMs });
    }

    if (error instanceof OutboundHttpError) {
      throw error;
    }

    throw new OutboundHttpError('Outbound request failed.', { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  OutboundHttpError,
  fetchJson,
  isBlockedHostname,
  parseAllowedHosts,
  parseTimeoutMs,
  validateOutboundUrl,
};
