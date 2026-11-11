/** A little vine with three leaves, used as a rule under headings. Takes its colour from `currentColor`. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 24" fill="none" className={className} aria-hidden="true">
      <path d="M2 12h84M134 12h84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".55" />
      <path d="M110 4c5 3 8 8 8 14-6-1-11-6-8-14Z" fill="currentColor" />
      <path d="M110 4c-5 3-8 8-8 14 6-1 11-6 8-14Z" fill="currentColor" opacity=".7" />
      <path d="M92 12c4-4 8-4 12 0-4 4-8 4-12 0ZM116 12c4-4 8-4 12 0-4 4-8 4-12 0Z" fill="currentColor" opacity=".85" />
    </svg>
  );
}
