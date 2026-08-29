'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Glow';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return <p className="text-sm text-red-400">This invite link is missing a token. Ask your admin for a new one.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept invite.');

      // The email isn't known client-side here (only via the invite record
      // server-side); prompt login instead of trying to auto-sign-in.
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs text-white/50">
          Your name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs text-white/50">
          Set a password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-2 w-full py-3">
        {submitting ? 'Joining...' : 'Join team'}
      </Button>
    </form>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <Glow className="left-1/2 top-1/4 h-64 w-64 -translate-x-1/2" />
      <h1 className="text-2xl font-semibold tracking-tight text-white">Join your team</h1>
      <Suspense fallback={<p className="mt-8 text-sm text-white/40">Loading...</p>}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}
