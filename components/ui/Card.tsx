import { forwardRef, type HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'hero' | 'flat' | 'mustard';
};

const VARIANTS: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'border border-white/8 bg-gradient-card backdrop-blur-sm shadow-soft',
  hero:
    'border border-brand-cyan/25 bg-gradient-card backdrop-blur-sm shadow-lifted ring-1 ring-brand-cyan/10',
  flat: 'border border-white/8 bg-white/[0.03]',
  mustard:
    'border border-brand-mustard/30 bg-brand-mustard/[0.06] shadow-glow-mustard'
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', className = '', children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={`rounded-2xl p-5 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});
