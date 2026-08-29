import Link from 'next/link';
import { Compass, House } from '@phosphor-icons/react/dist/ssr';
import { Glow } from '@/components/ui/Glow';

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <Glow className="left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2" />

      <div className="glass-panel flex flex-col items-center gap-4 p-8">
        <Compass size={32} className="text-cyan-300" />
        <div>
          <h1 className="text-lg font-semibold text-white">Page not found</h1>
          <p className="mt-2 text-sm text-white/50">
            That page does not exist, or the series it linked to may have moved. Try searching from the explorer
            instead.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95"
          >
            <House size={14} />
            Back home
          </Link>
          <Link
            href="/us-outlook"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
          >
            Browse the explorer
          </Link>
        </div>
      </div>
    </div>
  );
}
