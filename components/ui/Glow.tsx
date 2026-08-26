/**
 * Subtle blurred radial gradient behind key content (main chart, hero) to
 * create depth. Deliberately not interactive (pointer-events-none) and
 * absolutely positioned so it never affects layout.
 */
export function Glow({
  className = '',
  color = 'rgba(34,211,238,0.15)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className}`}
      style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
    />
  );
}
