'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { UserCircle } from '@phosphor-icons/react';

export function AuthNavSection() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />;
  }

  if (!session) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="text-white/60 transition hover:text-white">
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-white/10 px-3 py-1.5 text-white/80 transition hover:border-white/20 hover:text-white"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/team" className="flex items-center gap-1.5 text-white/60 transition hover:text-white">
        <UserCircle size={16} />
        {session.user.companyName}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="text-white/40 transition hover:text-white/70 active:scale-95"
      >
        Sign out
      </button>
    </div>
  );
}
