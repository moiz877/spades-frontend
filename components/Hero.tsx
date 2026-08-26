'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'motion/react';

const Globe = dynamic(() => import('@/components/three/Globe'), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

const Starfield = dynamic(() => import('@/components/Starfield').then((m) => m.Starfield), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden pt-16">
      <Starfield />
      <div className="absolute inset-0 opacity-70">
        <Globe />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl font-semibold tracking-tighter text-white md:text-6xl"
        >
          Every barrel, watt, and ton, mapped to 2050.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-xl text-base text-white/60"
        >
          Explore full EIA Annual and International Energy Outlook projections,
          from category to chart, without touching a spreadsheet.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex items-center justify-center"
        >
          <Link
            href="/us-outlook"
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-medium text-white shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:opacity-90 active:scale-[0.98]"
          >
            Explore the data
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
