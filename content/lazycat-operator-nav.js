// LazyCat player chrome — never fetch /api/settings from the browser (401 +
// WWW-Authenticate triggers the native username/password dialog even when the
// operator is already logged into the LazyCat client).
(function () {
  if (document.querySelector('[data-lzc-operator-nav]')) return;
  if (!/\.heiyu\.space$/i.test(window.location.hostname)) return;

  const headerRow = document.querySelector('.player-topbar > div');
  if (!headerRow) return;
  const right = headerRow.querySelector(':scope > div:last-child');
  if (!right) return;

  const nav = document.createElement('nav');
  nav.setAttribute('data-lzc-operator-nav', '1');
  nav.setAttribute('aria-label', 'Operator');
  nav.style.cssText =
    'display:flex;align-items:center;gap:0.75rem;margin-right:0.75rem;padding-right:0.75rem;border-right:1px solid color-mix(in oklab, var(--ink, #111) 15%, transparent);font-size:11px;letter-spacing:0.04em;text-transform:uppercase;';

  const link = (href, label) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.style.cssText =
      'color:color-mix(in oklab, var(--ink, #111) 55%, transparent);text-decoration:none;';
    a.onmouseenter = () => { a.style.textDecoration = 'underline'; };
    a.onmouseleave = () => { a.style.textDecoration = 'none'; };
    return a;
  };

  nav.appendChild(link('/onboarding', 'Setup'));
  nav.appendChild(link('/admin', 'Admin'));
  right.insertBefore(nav, right.firstChild);
})();
