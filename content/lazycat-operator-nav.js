// Injected on player routes when the GHCR web image predates useOperatorAccess.
// Adds Setup / Admin links for LazyCat operators (ADMIN role + request inject).
(async () => {
  if (document.querySelector('[data-lzc-operator-nav]')) return;

  let ok = false;
  try {
    const r = await fetch('/api/settings', { credentials: 'include' });
    ok = r.ok;
  } catch {
    return;
  }
  if (!ok) return;

  const headerRow = document.querySelector('.player-topbar > div');
  if (!headerRow) return;
  const right = headerRow.querySelector(':scope > div:last-child');
  if (!right) return;

  const nav = document.createElement('nav');
  nav.setAttribute('data-lzc-operator-nav', '1');
  nav.setAttribute('aria-label', 'Operator');
  nav.style.cssText =
    'display:flex;align-items:center;gap:0.75rem;margin-right:0.75rem;padding-right:0.75rem;border-right:1px solid color-mix(in oklab, var(--ink, #111) 15%, transparent);font-size:11px;letter-spacing:0.04em;text-transform:uppercase;';

  const link = (href, label, bold) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.style.cssText =
      'color:' +
      (bold ? 'var(--vermilion, #c44)' : 'color-mix(in oklab, var(--ink, #111) 55%, transparent)') +
      ';text-decoration:none;';
    a.onmouseenter = () => { a.style.textDecoration = 'underline'; };
    a.onmouseleave = () => { a.style.textDecoration = 'none'; };
    return a;
  };

  let needsSetup = false;
  try {
    const st = await fetch('/api/onboarding/status', { credentials: 'include' });
    if (st.ok) {
      const j = await st.json();
      needsSetup = !!j.needsSetup;
    }
  } catch {}

  nav.appendChild(link('/onboarding', 'Setup', needsSetup));
  nav.appendChild(link('/admin', 'Admin', false));
  right.insertBefore(nav, right.firstChild);
})();
