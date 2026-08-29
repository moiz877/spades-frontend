'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Glow';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn('credentials', { email, password, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      setError('Incorrect email or password.');
      return;
    }
    router.push('/team');
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <Glow className="left-1/2 top-1/4 h-64 w-64 -translate-x-1/2" />

      <h1 className="text-2xl font-semibold tracking-tight text-white">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs text-white/50">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs text-white/50">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full py-3">
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-cyan-400 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
