import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import type { NarrativeSections } from './teaTypes';

/** Shared verdict styling so the scenarios list and the executive summary report agree on color/label. */
export const VERDICT_STYLES: Record<
  NarrativeSections['verdict'],
  { label: string; icon: typeof CheckCircle; classes: string; dotClasses: string }
> = {
  positive: {
    label: 'Investable',
    icon: CheckCircle,
    classes: 'bg-emerald-100 text-emerald-800',
    dotClasses: 'bg-emerald-400',
  },
  marginal: {
    label: 'Marginal',
    icon: Warning,
    classes: 'bg-amber-100 text-amber-800',
    dotClasses: 'bg-amber-400',
  },
  negative: {
    label: 'Not investable',
    icon: XCircle,
    classes: 'bg-red-100 text-red-800',
    dotClasses: 'bg-red-400',
  },
};
