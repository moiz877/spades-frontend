'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Glow';

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');

      const signInResult = await signIn('credentials', { email, password, redirect: false });
      if (signInResult?.error) {
        // Account created but auto-login failed for some reason -- send them to log in manually.
        router.push('/login');
        return;
      }
      router.push('/team');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <Glow className="left-1/2 top-1/4 h-64 w-64 -translate-x-1/2" />

      <h1 className="text-2xl font-semibold tracking-tight text-white">Create your company account</h1>
      <p className="mt-2 text-sm text-white/60">
        One account per company. Invite teammates once you&apos;re in.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <Field label="Company name" value={companyName} onChange={setCompanyName} type="text" />
        <Field label="Your name" value={name} onChange={setName} type="text" />
        <Field label="Work email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" minLength={8} />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2 w-full py-3">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link href="/login" className="text-cyan-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  minLength?: number;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-white/50">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-cyan-400/50"
      />
    </div>
  );
}
