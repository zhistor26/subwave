'use client';

import * as Switch from '@radix-ui/react-switch';

/* V3 Switch — sharp 48×24, 1px ink border, accent fill when on, no rounding. */
export function V3Switch({ checked, onCheckedChange, disabled }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative w-12 h-6 v3-focus disabled:opacity-40 cursor-pointer"
      style={{
        border: '1px solid var(--ink)',
        background: checked ? 'var(--accent)' : 'transparent',
      }}
    >
      <Switch.Thumb
        className="block w-4 h-4 transition-transform"
        style={{
          background: checked ? 'var(--bg)' : 'var(--ink)',
          transform: checked ? 'translateX(28px)' : 'translateX(2px)',
          marginTop: 3,
        }}
      />
    </Switch.Root>
  );
}
