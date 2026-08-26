'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLeadGateStore } from '@/lib/leadGateStore';

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
            className="glass-panel w-full max-w-md p-8 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h2 className="text-xl font-semibold text-white">
              Unlock unlimited comparisons and report exports
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Get unlimited series comparisons and export CFO-ready TEA reports for any series.
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-medium text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Unlocking...' : 'Unlock access'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-white/40 transition hover:text-white/70"
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
