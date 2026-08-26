'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  ChartLineUp,
  Globe as GlobeIcon,
  Broadcast,
  Stack,
  House,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { useCommandPaletteStore } from '@/lib/commandPaletteStore';

const PAGES = [
  { href: '/', label: 'Home', icon: House },
  { href: '/us-outlook', label: 'US Outlook (AEO2026)', icon: ChartLineUp },
  { href: '/global-outlook', label: 'Global Outlook (IEO)', icon: GlobeIcon },
  { href: '/compare', label: 'Compare series', icon: Stack },
  { href: '/live', label: 'Live EIA data', icon: Broadcast },
];

/**
 * Global Cmd+K / Ctrl+K command palette for jumping between pages.
 * Mounted once in the root layout.
 */
export function CommandPalette() {
  const { isOpen, toggle, close, open: openPalette } = useCommandPaletteStore();
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  function go(href: string) {
    close();
    router.push(href);
  }

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={(next) => (next ? openPalette() : close())}
      label="Command menu"
      className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0f15]/95 shadow-2xl backdrop-blur-xl"
      overlayClassName="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-24 z-[60] w-full max-w-lg -translate-x-1/2"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MagnifyingGlass size={16} className="text-white/40" />
        <Command.Input
          placeholder="Jump to..."
          className="w-full bg-transparent text-sm text-white placeholder-white/30 outline-none"
        />
        <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/30">esc</kbd>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-white/40">No results.</Command.Empty>
        {PAGES.map(({ href, label, icon: Icon }) => (
          <Command.Item
            key={href}
            value={label}
            onSelect={() => go(href)}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 aria-selected:bg-cyan-500/10 aria-selected:text-cyan-300"
          >
            <Icon size={16} />
            {label}
          </Command.Item>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
