// Admin auth. Standard SUB/WAVE deploys use HTTP Basic. LazyCat LPK deploys
// can instead trust the MicroServer ingress auth headers, so operators do not
// need a second app-local admin password after logging into LazyCat.
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASS = process.env.ADMIN_PASS || '';
export const ADMIN_AUTH_REQUIRED = Boolean(ADMIN_USER && ADMIN_PASS);
const TRUST_LAZYCAT_AUTH =
  process.env.SUBWAVE_TRUST_LAZYCAT_AUTH === '1' ||
  process.env.SUBWAVE_TRUST_LAZYCAT_AUTH === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';

// Called once at startup. Exits the process if a production deploy is missing
// admin credentials, then logs the resolved gate state.
export function assertAdminConfigured() {
  if (IS_PROD && !ADMIN_AUTH_REQUIRED && !TRUST_LAZYCAT_AUTH) {
    console.error(
      '[auth] FATAL: NODE_ENV=production but no admin auth mode is configured.\n' +
      '       /debug, /settings and admin endpoints would be publicly readable.\n' +
      '       Set ADMIN_USER and ADMIN_PASS, or set SUBWAVE_TRUST_LAZYCAT_AUTH=true in an LPK deploy.'
    );
    process.exit(1);
  }
  const modes = [
    ADMIN_AUTH_REQUIRED ? 'basic' : '',
    TRUST_LAZYCAT_AUTH ? 'lazycat-inject' : '',
  ].filter(Boolean);
  console.log(
    `[auth] admin gate ${
      modes.length ? `ENABLED (${modes.join(', ')})` : 'disabled (set ADMIN_USER+ADMIN_PASS to enable)'
    }`
  );
}

export function requireAdmin(req, res, next) {
  if (TRUST_LAZYCAT_AUTH && isLazyCatAdmin(req)) return next();
  if (!ADMIN_AUTH_REQUIRED) return next();
  const header = req.headers.authorization || '';
  if (header.startsWith('Basic ')) {
    try {
      const [u, p] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
      if (u === ADMIN_USER && p === ADMIN_PASS) return next();
    } catch {}
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="SUB/WAVE admin"');
  return res.status(401).json({ error: 'admin auth required' });
}

function isLazyCatAdmin(req) {
  const forwardedBy = headerValue(req, 'x-forwarded-by').toLowerCase();
  const userId = headerValue(req, 'x-hc-user-id');
  const role = headerValue(req, 'x-hc-user-role').toUpperCase();

  // The LazyCat ingress injects these after its own login gate. Requiring the
  // ingress marker avoids treating ordinary client-supplied headers as admin.
  return forwardedBy.includes('lzc-ingress') && Boolean(userId) && role === 'ADMIN';
}

function headerValue(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}
