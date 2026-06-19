// LazyCat admin/onboarding bootstrap — works even when the baked web image
// predates useAdminAuth's heiyu.space bypass. Seeds the same token the
// request inject sends so onboarding wizard API calls succeed after theme
// switches or client re-renders resurrect the sign-in form.
(function () {
  if (!/\.heiyu\.space$/i.test(window.location.hostname)) return;

  try {
    localStorage.setItem('subwave_admin_auth', btoa('admin:025676'));
  } catch {
    /* private mode */
  }

  const hideSignIn = () => {
    document.querySelectorAll('form').forEach((f) => {
      const t = f.textContent || '';
      if (/ADMIN_USER|admin sign-in|Sign in with the/i.test(t)) {
        const panel = f.closest('.mx-auto') || f.parentElement;
        if (panel && !panel.dataset.lzcBootstrapped) {
          panel.dataset.lzcBootstrapped = '1';
          panel.innerHTML =
            '<p style="font-size:14px;line-height:1.5;color:color-mix(in oklab,var(--ink,#111) 70%,transparent)">' +
            '已使用懒猫微服登录。若向导未自动出现，请<a href="/onboarding" style="text-decoration:underline">刷新本页</a>。' +
            '需要 ADMIN 权限才能保存配置。</p>';
        }
      }
    });
  };

  hideSignIn();
  new MutationObserver(hideSignIn).observe(document.body, { childList: true, subtree: true });
})();
