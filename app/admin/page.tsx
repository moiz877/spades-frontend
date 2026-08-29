'use client';

import { useEffect, useState } from 'react';
import { DownloadSimple, ArrowsClockwise } from '@phosphor-icons/react';

interface Lead {
  _id: string;
  email: string;
  company_name: string;
  is_work_email_guess: boolean;
  last_context: string | null;
  created_at?: string;
  last_seen?: string;
  exports?: { series_id: string; ten_yr_delta: number; at: string }[];
}

interface DataFreshnessSource {
  source: string;
  filename: string;
  series_count: number;
  ingested_at: string;
}

const STORAGE_KEY = 'adminPassword';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<DataFreshnessSource[] | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPassword(stored);
      setAuthed(true);
    }
  }, []);

  async function loadLeads(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/leads', {
        headers: { Authorization: `Bearer ${pw}` },
      });
      if (res.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem(STORAGE_KEY);
        setError('Incorrect password.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load leads.');
      const data = await res.json();
      setLeads(data.leads ?? []);
      setAuthed(true);
      sessionStorage.setItem(STORAGE_KEY, pw);

      fetch('/api/admin/data-freshness', { headers: { Authorization: `Bearer ${pw}` } })
        .then((r) => r.json())
        .then((d) => setFreshness(d.sources ?? []))
        .catch(() => setFreshness(null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    const res = await fetch('/api/admin/leads/export', {
      headers: { Authorization: `Bearer ${password}` },
    });
    if (!res.ok) {
      setError('Export failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-lg font-semibold text-white">Admin</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadLeads(password);
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Leads</h1>
          <p className="text-sm text-white/50">{leads?.length ?? 0} captured</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadLeads(password)}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:text-white"
          >
            <ArrowsClockwise size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
          >
            <DownloadSimple size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {freshness && freshness.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {freshness.map((src) => (
            <div
              key={src.source}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60"
            >
              <span className="font-medium text-white/80">{src.source.toUpperCase()}</span>: {src.filename} (
              {src.series_count.toLocaleString()} series), ingested{' '}
              {new Date(src.ingested_at).toLocaleDateString()}
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel mt-6 overflow-x-auto p-4">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs text-white/40">
              <th className="pb-2 pr-4 font-normal">Email</th>
              <th className="pb-2 pr-4 font-normal">Company</th>
              <th className="pb-2 pr-4 font-normal">Work email?</th>
              <th className="pb-2 pr-4 font-normal">Last trigger</th>
              <th className="pb-2 pr-4 font-normal">Last seen</th>
              <th className="pb-2 font-normal">Exports</th>
            </tr>
          </thead>
          <tbody className="text-white/70">
            {(leads ?? []).map((lead) => (
              <tr key={lead._id} className="border-t border-white/5">
                <td className="py-2 pr-4">
                  <a href={`mailto:${lead.email}`} className="text-cyan-400 hover:underline">
                    {lead.email}
                  </a>
                </td>
                <td className="py-2 pr-4">{lead.company_name}</td>
                <td className="py-2 pr-4">{lead.is_work_email_guess ? 'Likely' : 'Personal'}</td>
                <td className="py-2 pr-4 max-w-[16rem] truncate">{lead.last_context ?? '-'}</td>
                <td className="py-2 pr-4 font-mono-tabular text-xs">
                  {lead.last_seen ? new Date(lead.last_seen).toLocaleString() : '-'}
                </td>
                <td className="py-2 font-mono-tabular text-xs">{lead.exports?.length ?? 0}</td>
              </tr>
            ))}
            {leads?.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/40">
                  No leads captured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
