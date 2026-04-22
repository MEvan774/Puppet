// Small diagonal syringe icon that inherits its color from the surrounding
// text (via `currentColor`), so it picks up the button's active/inactive style.
export default function SyringeIcon({ size = 22, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="rotate(-45 12 12)">
        {/* Plunger handle */}
        <rect x="9.2" y="2.2" width="5.6" height="1.6" rx="0.4" fill="currentColor" stroke="none" />
        {/* Plunger rod */}
        <line x1="12" y1="3.8" x2="12" y2="6.8" />
        {/* Flange */}
        <line x1="7.4" y1="6.8" x2="16.6" y2="6.8" />
        {/* Barrel */}
        <rect x="9.4" y="6.8" width="5.2" height="8.4" />
        {/* Fluid (filled portion) */}
        <rect x="9.4" y="9.8" width="5.2" height="5.4" fill="currentColor" stroke="none" />
        {/* Graduations */}
        <line x1="9.4" y1="8.6" x2="10.6" y2="8.6" />
        <line x1="9.4" y1="11.2" x2="10.6" y2="11.2" />
        <line x1="9.4" y1="13.8" x2="10.6" y2="13.8" />
        {/* Taper to hub */}
        <path d="M9.4 15.2 L12 17 L14.6 15.2" fill="currentColor" stroke="currentColor" />
        {/* Needle */}
        <line x1="12" y1="17" x2="12" y2="22" />
      </g>
    </svg>
  )
}
