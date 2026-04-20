interface AppyDaveLogoProps {
  className?: string;
  size?: number;
}

export function AppyDaveLogo({ className = '', size = 32 }: AppyDaveLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AppyDave Logo"
    >
      {/* Outer circle gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#60A5FA', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#A78BFA', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" />

      {/* Letter 'A' */}
      <path
        d="M 50 25 L 65 70 L 57 70 L 54 60 L 46 60 L 43 70 L 35 70 Z M 48 53 L 52 53 L 50 40 Z"
        fill="white"
        stroke="white"
        strokeWidth="1"
      />

      {/* Letter 'D' accent */}
      <path
        d="M 70 45 Q 75 50 70 55"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
