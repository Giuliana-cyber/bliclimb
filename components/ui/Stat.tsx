import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  href?: string;
  icon?: LucideIcon;
  tone?: 'cyan' | 'mustard' | 'coral';
};

const TONE: Record<NonNullable<Props['tone']>, { text: string; bg: string }> = {
  cyan: { text: 'text-brand-cyan', bg: 'bg-brand-cyan/12' },
  mustard: { text: 'text-brand-mustard', bg: 'bg-brand-mustard/12' },
  coral: { text: 'text-brand-coral', bg: 'bg-brand-coral/12' }
};

export function Stat({ label, value, href, icon: Icon, tone = 'cyan' }: Props) {
  const tones = TONE[tone];
  const body = (
    <div className="rounded-2xl border border-white/8 bg-gradient-card p-4 transition hover:border-white/15 hover:shadow-soft">
      <div className="flex items-center justify-between">
        {Icon ? (
          <div className={`grid size-9 place-items-center rounded-xl ${tones.bg} ${tones.text}`}>
            <Icon aria-hidden="true" size={18} strokeWidth={2.3} />
          </div>
        ) : null}
        <p className="text-xs font-bold uppercase tracking-[0.10em] text-white/45">{label}</p>
      </div>
      <p className="mt-3 text-xl font-extrabold leading-tight text-white">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }

  return body;
}
