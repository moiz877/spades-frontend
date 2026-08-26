import Link from 'next/link';
import { BookCallButton } from './BookCallButton';

const LINKS = [
  { href: '/us-outlook', label: 'US Outlook' },
  { href: '/global-outlook', label: 'Global Outlook' },
  { href: '/live', label: 'Live Data' },
  { href: '/compare', label: 'Compare' },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05070a]/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Energy Outlook Explorer
        </Link>
        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <BookCallButton />
        </div>
      </nav>
    </header>
  );
}
