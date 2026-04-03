// web/app/components/BatanaLogo.tsx
export default function BatanaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer hexagon - Great Zimbabwe inspired */}
      <polygon
        points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
        fill="none"
        stroke="#a8845a"
        strokeWidth="3"
      />
      {/* Inner circle */}
      <circle cx="50" cy="50" r="20" fill="#a8845a" opacity="0.15" />
      {/* Gold dot center */}
      <circle cx="50" cy="50" r="8" fill="#a8845a" />
      {/* Connecting lines - people connected */}
      <line x1="50" y1="42" x2="50" y2="15" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      <line x1="50" y1="58" x2="50" y2="85" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      <line x1="43" y1="46" x2="20" y2="32" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      <line x1="57" y1="54" x2="80" y2="68" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      <line x1="57" y1="46" x2="80" y2="32" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      <line x1="43" y1="54" x2="20" y2="68" stroke="#a8845a" strokeWidth="2" opacity="0.5" />
      {/* Small dots at connection points */}
      <circle cx="50" cy="15" r="4" fill="#a8845a" opacity="0.7" />
      <circle cx="50" cy="85" r="4" fill="#a8845a" opacity="0.7" />
      <circle cx="20" cy="32" r="4" fill="#a8845a" opacity="0.7" />
      <circle cx="80" cy="68" r="4" fill="#a8845a" opacity="0.7" />
      <circle cx="80" cy="32" r="4" fill="#a8845a" opacity="0.7" />
      <circle cx="20" cy="68" r="4" fill="#a8845a" opacity="0.7" />
    </svg>
  );
}