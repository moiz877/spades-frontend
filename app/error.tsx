'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowCounterClockwise, House, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Glow';

/**
 * Root error boundary. Next.js mounts this in place of the crashed
 * segment for any uncaught render/render-effect error, replacing the
 * framework's default plain crash screen.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <Glow className="left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2" />

      <div className="glass-panel flex flex-col items-center gap-4 p-8">
        <WarningCircle size={32} className="text-red-400" />
        <div>
          <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
          <p className="mt-2 text-sm text-white/50">
            That request hit an unexpected error on our end. It has been logged. Try again, or head back home.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            <ArrowCounterClockwise size={14} />
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <House size={14} />
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
