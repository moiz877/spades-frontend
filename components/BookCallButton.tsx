import { CalendarBlank } from '@phosphor-icons/react/dist/ssr';

/**
 * Server-safe CTA (no client interactivity needed, it's a plain link).
 * NEXT_PUBLIC_BOOKING_URL points at whatever booking tool is set up
 * (Cal.com, Calendly, ...). Renders nothing if unset, rather than
 * shipping a dead button.
 */
export function BookCallButton({ className = '' }: { className?: string }) {
  const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL;
  if (!bookingUrl) return null;

  return (
    <a
      href={bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98] ${className}`}
    >
      <CalendarBlank size={14} />
      Book a call
    </a>
  );
}
