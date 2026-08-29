import Link from 'next/link';
import { BookCallButton } from './BookCallButton';
import { CommandPaletteTrigger } from './CommandPaletteTrigger';
import { AuthNavSection } from './AuthNavSection';
import { MobileNavMenu } from './MobileNavMenu';

const LINKS = [
  { href: '/tea-builder', label: 'TEA Builder' },
  { href: '/us-outlook', label: 'US Outlook' },
  { href: '/global-outlook', label: 'Global Outlook' },
  { href: '/live', label: 'Live Data' },
  { href: '/compare', label: 'Compare' },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight text-white">
          ScaleCase
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-white/60 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <CommandPaletteTrigger />
          <AuthNavSection />
          <BookCallButton />
          <MobileNavMenu />
        </div>
      </nav>
    </header>
  );
}
