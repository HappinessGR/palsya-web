/** Ported 1:1 from assets/js/util.js P.mark. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#e6f5f3" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#cfeae6" />
      <path d="M9.6 12.4c1.5-1.3 3.4-1.3 4.9 0" stroke="#0f9488" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M17.5 12.4c1.5-1.3 3.4-1.3 4.9 0" stroke="#0f9488" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M10.5 19.6c3.3 2.8 7.7 2.8 11 0" stroke="#e2833c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
