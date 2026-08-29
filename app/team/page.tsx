'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserPlus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { TeamRole, UserDocument, InviteDocument } from '@/lib/types';

type MemberRow = Omit<UserDocument, 'password_hash'>;

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [pendingInvites, setPendingInvites] = useState<InviteDocument[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  function loadTeam() {
    fetch('/api/team/members')
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setPendingInvites(data.pendingInvites ?? []);
      })
      .catch(() => setMembers([]));
  }

  useEffect(() => {
    if (status === 'authenticated') loadTeam();
  }, [status]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setManualLink(null);

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite.');

      if (!data.emailed && data.acceptUrl) {
        setManualLink(data.acceptUrl);
      }
      setInviteEmail('');
      loadTeam();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite.');
    } finally {
      setInviting(false);
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <SkeletonList rows={4} />
      </div>
    );
  }

  const isAdmin = session.user.role === 'admin';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-white">{session.user.companyName}</h1>
      <p className="mt-1 text-sm text-white/50">
        {members?.length ?? 0} member{members?.length === 1 ? '' : 's'}
      </p>

      {isAdmin && (
        <div className="glass-panel mt-8 p-6">
          <h2 className="text-sm font-semibold text-white">Invite a teammate</h2>
          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="invite-email" className="text-xs text-white/50">
                Email
              </label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="text-xs text-white/50">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={inviting} className="whitespace-nowrap">
              <UserPlus size={14} />
              {inviting ? 'Sending...' : 'Send invite'}
            </Button>
          </form>
          {inviteError && <p className="mt-3 text-sm text-red-400">{inviteError}</p>}
          {manualLink && (
            <p className="mt-3 break-all text-xs text-amber-400">
              Email isn&apos;t configured yet (RESEND_API_KEY missing). Share this link manually:{' '}
              <span className="text-white/80">{manualLink}</span>
            </p>
          )}
        </div>
      )}

      <div className="glass-panel mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">Members</h2>
        {members === null ? (
          <div className="mt-4">
            <SkeletonList rows={3} />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {members.map((m) => (
              <li key={String(m._id)} className="flex items-center justify-between border-t border-white/5 py-2 text-sm first:border-t-0">
                <div>
                  <p className="text-white/90">{m.name}</p>
                  <p className="text-xs text-white/40">{m.email}</p>
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase tracking-wide text-white/50">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}

        {pendingInvites.length > 0 && (
          <>
            <h3 className="mt-6 text-xs uppercase tracking-wide text-white/40">Pending invites</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {pendingInvites.map((inv) => (
                <li key={String(inv._id)} className="flex items-center justify-between border-t border-white/5 py-2 text-sm first:border-t-0">
                  <p className="text-white/60">{inv.email}</p>
                  <span className="text-xs text-white/30">{inv.role}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
