import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  tone: 'cyan' | 'mustard' | 'danger' | 'neutral';
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
};

const TONE: Record<Props['tone'], { border: string; bg: string; iconBg: string; text: string }> = {
  cyan: {
    border: 'border-brand-cyan/25',
    bg: 'bg-brand-cyan/[0.06]',
    iconBg: 'bg-brand-cyan/15 text-brand-cyan',
    text: 'text-brand-cyan'
  },
  mustard: {
    border: 'border-brand-mustard/30',
    bg: 'bg-brand-mustard/[0.08]',
    iconBg: 'bg-brand-mustard/15 text-brand-mustard',
    text: 'text-brand-mustard'
  },
  danger: {
    border: 'border-red-400/30',
    bg: 'bg-red-500/[0.08]',
    iconBg: 'bg-red-500/15 text-red-300',
    text: 'text-red-300'
  },
  neutral: {
    border: 'border-white/10',
    bg: 'bg-white/[0.04]',
    iconBg: 'bg-white/10 text-white/70',
    text: 'text-white/70'
  }
};

export function Banner({ tone, icon: Icon, title, description, children }: Props) {
  const t = TONE[tone];
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-4`}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.iconBg}`}>
            <Icon aria-hidden="true" size={19} strokeWidth={2.3} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${t.text}`}>{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-white/72">{description}</p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
