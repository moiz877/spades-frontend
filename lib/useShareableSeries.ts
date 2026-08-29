'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Keeps a Map<seriesId, name> selection in sync with a `series=id1,id2`
 * query param, so a chart's URL can be copied and reopened with the same
 * series selected. Names are just placeholders (the id itself) until the
 * caller's own data fetch resolves and calls `hydrateNames`.
 */
export function useShareableSeries(paramName = 'series') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skipNextUrlSync = useRef(true);

  const [selected, setSelected] = useState<Map<string, string>>(() => {
    const raw = searchParams.get(paramName);
    if (!raw) return new Map();
    return new Map(raw.split(',').filter(Boolean).map((id) => [id, id]));
  });

  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      return;
    }
    const ids = Array.from(selected.keys());
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length > 0) {
      params.set(paramName, ids.join(','));
    } else {
      params.delete(paramName);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Only re-run when the selection itself changes; searchParams/router/
    // pathname identity churn on every navigation and would cause loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function hydrateNames(docs: { series_id: string; name: string }[]) {
    if (docs.length === 0) return;
    setSelected((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const doc of docs) {
        if (next.has(doc.series_id) && next.get(doc.series_id) !== doc.name) {
          next.set(doc.series_id, doc.name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  return { selected, setSelected, hydrateNames };
}
