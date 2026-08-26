'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

/**
 * Fade/slide-up entrance on route change. App Router unmounts the old
 * route immediately on navigation, so true crossfade exit animations
 * would need a routing library rework — this covers the common case
 * (no jarring layout pop-in) without that cost.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
