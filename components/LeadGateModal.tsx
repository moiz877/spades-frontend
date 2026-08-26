'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LockOpen } from '@phosphor-icons/react';
import { useLeadGateStore } from '@/lib/leadGateStore';
import { Button } from './ui/Button';
import { Glow } from './ui/Glow';

export function LeadGateModal() {
  const { isModalOpen, pendingContext, closeModal, unlock } = useLeadGateStore();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyName, context: pendingContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      unlock(data.token); // persists token to localStorage + store, used by export calls
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel relative w-full max-w-md overflow-hidden p-8 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <Glow className="left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2" />

            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
              <LockOpen size={18} className="text-cyan-300" />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
              Unlock CFO-ready PDF export
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Get unlimited series comparisons and export a CFO-ready techno-economic assessment
              for any series, in one click.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lead-email" className="text-xs text-white/50">
                  Work email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lead-company" className="text-xs text-white/50">
                  Company name
                </label>
                <input
                  id="lead-company"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full py-3">
                {submitting ? 'Unlocking...' : 'Unlock access'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-white/40 transition hover:text-white/70 active:scale-95"
              >
                Not now
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
