/** Operator entry points shared by TopBar, CommandPalette, and LazyCat inject. */

export const ADMIN_CONSOLE_HREF = '/admin/dash';

export function setupHref(needsSetup: boolean | null | undefined): string {
  return needsSetup ? '/onboarding' : '/admin/settings';
}
