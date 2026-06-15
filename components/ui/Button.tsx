import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'mustard';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-cyan text-brand-dark hover:brightness-110 shadow-glow active:scale-[0.98]',
  secondary:
    'border border-white/14 bg-white/[0.04] text-white hover:border-brand-cyan/50 hover:bg-white/[0.07] active:scale-[0.98]',
  ghost: 'text-white/70 hover:text-white hover:bg-white/[0.05]',
  mustard:
    'bg-gradient-mustard text-brand-dark hover:brightness-110 shadow-glow-mustard active:scale-[0.98]'
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-6 text-base'
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

function baseClasses(variant: Variant, size: Size) {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]}`;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className = '', children, ...rest },
  ref
) {
  const classes = `${baseClasses(variant, size)} ${className}`;

  if ('href' in rest && rest.href) {
    const { href, ...anchorRest } = rest;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...anchorRest}
      >
        {icon}
        {children}
      </Link>
    );
  }

  const { href: _ignored, ...buttonRest } = rest as ButtonAsButton & { href?: undefined };

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...buttonRest}
    >
      {icon}
      {children}
    </button>
  );
});
