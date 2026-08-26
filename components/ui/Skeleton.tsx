import type { CSSProperties } from 'react';

export function SkeletonLine({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className}`} style={style} />;
}

/** Mimics a line chart's shape while data loads, instead of a spinner. */
export function SkeletonChart() {
  return (
    <div className="flex h-full min-h-[24rem] flex-col gap-4" aria-hidden="true">
      <div className="flex flex-1 items-end gap-3 px-2">
        {[40, 65, 45, 80, 55, 70, 50, 90, 60, 75, 48, 85].map((height, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-white/[0.06]"
            style={{ height: `${height}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="flex justify-between px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLine key={i} className="h-2.5 w-8" />
        ))}
      </div>
    </div>
  );
}

/** Mimics a search/tree result list while data loads. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="h-8 w-full" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

/** Mimics a data table while rows load. */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonLine key={c} className="h-4 flex-1" style={{ animationDelay: `${(r + c) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
