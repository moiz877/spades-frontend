'use client';

// Zustand store — single source of truth for gate state, checked from both
// the Compare view (3rd-attempt trigger) and the ROI export button. They
// must never diverge in behavior: both read/write this same store.
import { create } from 'zustand';

interface LeadGateState {
  isUnlocked: boolean;
  token: string | null;
  isModalOpen: boolean;
  pendingContext: string | null;
  openModal: (context: string) => void;
  closeModal: () => void;
  unlock: (token: string) => void;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('leadToken');
  } catch {
    return null;
  }
}

export const useLeadGateStore = create<LeadGateState>((set) => ({
  isUnlocked: readStoredToken() !== null,
  token: readStoredToken(),
  isModalOpen: false,
  pendingContext: null,
  openModal: (context) => set({ isModalOpen: true, pendingContext: context }),
  closeModal: () => set({ isModalOpen: false }),
  unlock: (token) => {
    try {
      localStorage.setItem('leadToken', token);
    } catch {
      // localStorage unavailable (private mode, etc.) — unlock still works
      // for this session, it just won't survive a refresh.
    }
    set({ isUnlocked: true, token, isModalOpen: false });
  },
}));

// --- Compare-attempt tracking, used only by the Compare view ---
const FREE_ATTEMPTS = 2;

export function useCompareGate() {
  const { isUnlocked, openModal } = useLeadGateStore();

  function attemptCompare(seriesIds: string[]): boolean {
    if (isUnlocked) return true; // unlimited once unlocked
    if (typeof window === 'undefined') return true;

    let count = 0;
    try {
      count = Number(localStorage.getItem('compareAttempts') ?? '0');
    } catch {
      return true; // no localStorage — don't block, just don't gate either
    }

    if (count >= FREE_ATTEMPTS) {
      openModal(`compare:${seriesIds.join(',')}`);
      return false; // caller should NOT execute the comparison
    }

    try {
      localStorage.setItem('compareAttempts', String(count + 1));
    } catch {
      // ignore
    }
    return true;
  }

  return { attemptCompare };
}
