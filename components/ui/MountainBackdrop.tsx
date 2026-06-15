export function MountainBackdrop({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full opacity-[0.18] ${className}`}
    >
      <defs>
        <linearGradient id="m1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="m2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8b931" />
          <stop offset="100%" stopColor="#e8b931" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,200 L0,140 L50,90 L90,120 L140,60 L190,110 L240,75 L290,130 L340,95 L400,150 L400,200 Z"
        fill="url(#m1)"
      />
      <path
        d="M0,200 L0,170 L40,140 L100,165 L160,120 L220,155 L280,135 L340,160 L400,140 L400,200 Z"
        fill="url(#m2)"
      />
    </svg>
  );
}
