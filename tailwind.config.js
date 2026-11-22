/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Prosperr brand (prosperr.io). See docs/DESIGN.md for how each token is used.
        brand: {
          forest: '#053F1A', 'forest-700': '#06481F', 'forest-600': '#0E5A2A', 'forest-50': '#E8EFEA',
          navy: '#202E64', 'navy-400': '#4A5E96', 'navy-50': '#EAEDF5',
          lime: '#8BC34A', 'lime-300': '#B5DB88', 'lime-50': '#F1F8E8',
          charcoal: '#0D0D0D',
          night: '#0D0D0D', paper: '#EFEFEF', mint: '#23B24A',
        },
        canvas: '#F3F3F5',
        paper: '#EFEFEF',
        line: '#DCDCDE',
        ink: { DEFAULT: '#0D0D0D', soft: '#2C4535', muted: '#56705F' },
        accent: { DEFAULT: '#053F1A', soft: '#E8EFEA', hover: '#06481F' },
        success: { DEFAULT: '#1FA645', soft: '#E8EFEA' },
        warning: { DEFAULT: '#202E64', soft: '#E9EBF3' },
        danger: { DEFAULT: '#202E64', soft: '#E9EBF3' },
      },
      fontSize: { '2xs': ['11px', '16px'] },
      boxShadow: {
        card: '0 1px 2px rgba(21,27,25,0.04)',
        glow: '0 0 0 1px rgba(13,13,13,0.06), 0 18px 40px -14px rgba(5,63,26,0.55)',
        pop: '0 8px 24px rgba(21,27,25,0.10), 0 1px 3px rgba(21,27,25,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'slide-in': { from: { transform: 'translateX(16px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        'check-pop': { '0%': { transform: 'scale(.6)' }, '60%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        'scroll-cue': { '0%,100%': { transform: 'translateY(0)', opacity: 1 }, '50%': { transform: 'translateY(8px)', opacity: .4 } },
        'marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'orbit': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        'shine': { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'gradient-pan': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
        'slide-in': 'slide-in 180ms ease-out',
        'check-pop': 'check-pop 260ms cubic-bezier(.2,.8,.2,1)',
        'scroll-cue': 'scroll-cue 1.8s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 18s ease-in-out infinite',
        'marquee': 'marquee 28s linear infinite',
        'orbit': 'orbit 40s linear infinite',
        'shine': 'shine 6s linear infinite',
      },
    },
  },
  plugins: [],
};
