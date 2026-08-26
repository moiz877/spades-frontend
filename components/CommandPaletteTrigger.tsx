'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { useCommandPaletteStore } from '@/lib/commandPaletteStore';

export function CommandPaletteTrigger() {
  const open = useCommandPaletteStore((s) => s.open);

  return (
    <button
      type="button"
      onClick={open}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40 transition hover:border-white/20 hover:text-white/70"
    >
      <MagnifyingGlass size={13} />
      <span className="hidden sm:inline">Search</span>
      <kbd className="rounded border border-white/10 px-1 text-[10px]">&#8984;K</kbd>
    </button>
  );
}
