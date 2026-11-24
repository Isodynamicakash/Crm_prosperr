import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * Ask Prosperr's mascot: a seed-pod face with a sprout on top (growth, the idea behind "Prosperr") and a small ₹ coin.
 * It blinks now and then, the sprout sways, and while it is thinking its eyes glance up.
 */
export function Sprout({ size = 40, thinking = false, className }: { size?: number; thinking?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const look = thinking ? -2.2 : 0;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cn('sprout shrink-0 overflow-visible', thinking && 'sprout-thinking', className)} aria-hidden>
      <defs>
        <linearGradient id={`body${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3DD068" /><stop offset="1" stopColor="#0E7A33" />
        </linearGradient>
        <linearGradient id={`leaf${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B8F5C8" /><stop offset="1" stopColor="#23B24A" />
        </linearGradient>
        <radialGradient id={`shine${id}`} cx=".35" cy=".25" r=".6">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`coin${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08A" /><stop offset="1" stopColor="#E8A70F" />
        </linearGradient>
      </defs>
      {/* sprout */}
      <g className="sprout-stem" style={{ transformOrigin: '32px 20px' }}>
        <path d="M32 20 C32 15 32 12 33 8" stroke="#0E7A33" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M33 10 C27 3 19 5 18 9 C22 13 29 13 33 10 Z" fill={`url(#leaf${id})`} stroke="#0E7A33" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M33 9 C38 1 47 2 48 6 C44 11 37 12 33 9 Z" fill={`url(#leaf${id})`} stroke="#0E7A33" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      {/* body */}
      <path d="M32 18 C47 18 56 27 56 40 C56 53 45 60 32 60 C19 60 8 53 8 40 C8 27 17 18 32 18 Z" fill={`url(#body${id})`} stroke="#053F1A" strokeWidth="2" />
      <ellipse cx="25" cy="28" rx="12" ry="7" fill={`url(#shine${id})`} />
      {/* cheeks */}
      <ellipse cx="17.5" cy="45" rx="4" ry="2.6" fill="#FF9FB0" opacity=".55" />
      <ellipse cx="46.5" cy="45" rx="4" ry="2.6" fill="#FF9FB0" opacity=".55" />
      {/* eyes */}
      <g className="sprout-eyes" style={{ transformOrigin: '32px 38px' }}>
        <ellipse cx="23.5" cy="38" rx="5.2" ry="6" fill="#fff" />
        <ellipse cx="40.5" cy="38" rx="5.2" ry="6" fill="#fff" />
        <circle cx="24.5" cy={39 + look} r="2.9" fill="#0B2A16" />
        <circle cx="41.5" cy={39 + look} r="2.9" fill="#0B2A16" />
        <circle cx="25.6" cy={37.6 + look} r="1" fill="#fff" />
        <circle cx="42.6" cy={37.6 + look} r="1" fill="#fff" />
      </g>
      {/* smile */}
      {thinking
        ? <path d="M28.5 49.5 Q32 48.5 35.5 49.5" stroke="#053F1A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        : <path d="M27 47.5 Q32 53 37 47.5" stroke="#053F1A" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
      {/* ₹ coin */}
      <g transform="translate(51 54) rotate(-12)">
        <circle r="6.3" fill={`url(#coin${id})`} stroke="#9A6A00" strokeWidth="1.3" />
        <text x="0" y="3" textAnchor="middle" fontSize="8.4" fontWeight="800" fontFamily="Arial, sans-serif" fill="#7A4F00">₹</text>
      </g>
    </svg>
  );
}
