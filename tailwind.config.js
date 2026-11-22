/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Prosperr brand (prosperr.io). See docs/DESIGN.md for how each token is used.
        brand: {
          forest: '#063F1A', 'forest-700': '#0A5124', 'forest-600': '#11692F', 'forest-50': '#E9F2EC',
          navy: '#22366F', 'navy-400': '#4A5E96', 'navy-50': '#EAEDF5',
          lime: '#8BC34A', 'lime-300': '#B5DB88', 'lime-50': '#F1F8E8',
          charcoal: '#151B19',
        },
        canvas: '#F3F3F5',
        line: '#E4E6E5',
        ink: { DEFAULT: '#151B19', soft: '#46504B', muted: '#737C77' },
        accent: { DEFAULT: '#063F1A', soft: '#E9F2EC', hover: '#0A5124' },
        success: { DEFAULT: '#2E8B3E', soft: '#EAF5EC' },
        warning: { DEFAULT: '#E5A13B', soft: '#FCF4E6' },
        danger: { DEFAULT: '#D64545', soft: '#FBEBEB' },
      },
      fontSize: { '2xs': ['11px', '16px'] },
      boxShadow: {
        card: '0 1px 2px rgba(21,27,25,0.04)',
        glow: '0 0 0 1px rgba(139,195,74,0.35), 0 10px 40px -8px rgba(139,195,74,0.55)',
        pop: '0 8px 24px rgba(21,27,25,0.10), 0 1px 3px rgba(21,27,25,0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': { from: { opacity: 0, transform: 'scale(.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'slide-in': { from: { transform: 'translateX(16px)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        'check-pop': { '0%': { transform: 'scale(.6)' }, '60%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        'scroll-cue': { '0%,100%': { transform: 'translateY(0)', opacity: 1 }, '50%': { transform: 'translateY(8px)', opacity: .4 } },
        'gradient-pan': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 160ms ease-out',
        'slide-in': 'slide-in 180ms ease-out',
        'check-pop': 'check-pop 260ms cubic-bezier(.2,.8,.2,1)',
        'scroll-cue': 'scroll-cue 1.8s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
