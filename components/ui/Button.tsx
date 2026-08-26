'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:opacity-90 hover:shadow-[0_0_28px_rgba(34,211,238,0.32)]',
  secondary:
    'border border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10 hover:text-white',
  ghost: 'text-white/50 hover:text-white hover:bg-white/5',
};

/**
 * Shared button primitive so hover/active/disabled/focus states are
 * consistent everywhere instead of re-implemented per component.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium
          transition-all duration-150 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
          active:scale-95
          disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100
          ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
