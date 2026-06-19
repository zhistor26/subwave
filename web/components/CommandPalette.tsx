'use client';

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './ui/command';
import { Kbd } from './ui/kbd';
import { ADMIN_CONSOLE_HREF, setupHref } from '@/lib/operatorNav';

export type PlayerDrawer = 'timeline' | 'booth' | 'request' | 'schedule';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: HTMLElement | null;
  tunedIn: boolean;
  muted: boolean;
  onTune: () => void;
  onOpenDrawer: (kind: PlayerDrawer) => void;
  onToggleMute: () => void;
  onShowShortcuts: () => void;
  showOperatorNav?: boolean;
  needsSetup?: boolean | null;
}

interface PaletteItem {
  label: string;
  hint: string;
  onSelect: () => void;
}

/* ⌘K command palette for the listener-facing player. Operator routes are
   included when the session can reach /api/settings (LazyCat admin inject). */
export default function CommandPalette({
  open,
  onOpenChange,
  container,
  tunedIn,
  muted,
  onTune,
  onOpenDrawer,
  onToggleMute,
  onShowShortcuts,
  showOperatorNav = false,
  needsSetup = null,
}: CommandPaletteProps) {
  const run = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };

  const go = (href: string) => run(() => {
    window.location.href = href;
  });

  const items: PaletteItem[] = [
    { label: tunedIn ? 'Tune out' : 'Tune in', hint: 'Space', onSelect: run(onTune) },
    { label: 'Open Timeline', hint: '1', onSelect: run(() => onOpenDrawer('timeline')) },
    { label: 'Open Booth feed', hint: '2', onSelect: run(() => onOpenDrawer('booth')) },
    { label: 'Make a request', hint: '3', onSelect: run(() => onOpenDrawer('request')) },
    { label: 'Open Schedule', hint: '4', onSelect: run(() => onOpenDrawer('schedule')) },
    { label: muted ? 'Unmute' : 'Mute', hint: 'M', onSelect: run(onToggleMute) },
    { label: 'Keyboard shortcuts', hint: '?', onSelect: run(onShowShortcuts) },
  ];

  const operatorItems: PaletteItem[] = showOperatorNav
    ? [
        {
          label: needsSetup ? 'Open setup wizard' : 'Open settings',
          hint: 'S',
          onSelect: go(setupHref(needsSetup)),
        },
        { label: 'Open admin console', hint: 'A', onSelect: go(ADMIN_CONSOLE_HREF) },
        { label: 'Open player', hint: 'P', onSelect: go('/') },
      ]
    : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      container={container}
      label="Command palette"
    >
      <CommandInput placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        <CommandGroup heading="Player">
          {items.map((it) => (
            <CommandItem key={it.label} value={it.label} onSelect={it.onSelect}>
              <span>{it.label}</span>
              <Kbd>{it.hint}</Kbd>
            </CommandItem>
          ))}
        </CommandGroup>
        {operatorItems.length > 0 && (
          <CommandGroup heading="Operator">
            {operatorItems.map((it) => (
              <CommandItem key={it.label} value={it.label} onSelect={it.onSelect}>
                <span>{it.label}</span>
                <Kbd>{it.hint}</Kbd>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
