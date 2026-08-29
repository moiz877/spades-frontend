'use client';

import { useState } from 'react';
import Link from 'next/link';
import { List, X } from '@phosphor-icons/react';

const LINKS = [
  { href: '/tea-builder', label: 'TEA Builder' },
  { href: '/us-outlook', label: 'US Outlook' },
  { href: '/global-outlook', label: 'Global Outlook' },
  { href: '/live', label: 'Live Data' },
  { href: '/compare', label: 'Compare' },
];

/**
 * Nav.tsx hides the link row below md and relies on the command palette
 * for navigation there, but that requires knowing ⌘K exists. This gives
 * mobile visitors an explicit, visible way to reach the same pages.
 */
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
      >
        {open ? <X size={16} /> : <List size={16} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 z-40 border-b border-white/5 bg-[#0a0a0a]/95 px-6 py-4 backdrop-blur-md">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
