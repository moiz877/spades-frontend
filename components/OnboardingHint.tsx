'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Command, MagnifyingGlass, X } from '@phosphor-icons/react';

const STORAGE_KEY = 'onboarding-hint-dismissed';

/**
 * One-time welcome card for first-time visitors, pointing at the two
 * things that are easy to miss: the command palette and the TEA builder.
 * Dismissal is per-browser (localStorage), never shown again after.
 */
export function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Private browsing / storage blocked -- just skip the hint.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Nothing to persist to -- the hint just won't be sticky this visit.
    }
  }

  if (!visible) return null;

  return (
    <div className="glass-panel fixed bottom-6 right-6 z-50 w-[19rem] p-4 shadow-2xl">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-white/30 hover:text-white"
      >
        <X size={14} />
      </button>
      <h3 className="pr-6 text-sm font-semibold text-white">New here? Two quick tips</h3>
      <ul className="mt-3 flex flex-col gap-2.5 text-xs text-white/60">
        <li className="flex items-start gap-2">
          <MagnifyingGlass size={14} className="mt-0.5 shrink-0 text-cyan-300" />
          <span>
            Search or browse 215,000+ EIA series in{' '}
            <Link href="/us-outlook" onClick={dismiss} className="text-cyan-300 hover:underline">
              US Outlook
            </Link>{' '}
            and chart them instantly.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Command size={14} className="mt-0.5 shrink-0 text-cyan-300" />
          <span>
            Press <kbd className="rounded border border-white/10 px-1 py-0.5">⌘K</kbd> anywhere to jump straight to
            the TEA builder, comparisons, or saved scenarios.
          </span>
        </li>
      </ul>
      <button
        type="button"
        onClick={dismiss}
        className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        Got it
      </button>
    </div>
  );
}
