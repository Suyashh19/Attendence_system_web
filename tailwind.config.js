// Same palette as the mobile app (AttendanceApp/constants/colors.js)
const c = {
  navy: '#17132B',
  navySoft: '#2B2550',
  heroEnd: '#3A2196',
  primary: '#6D3BF5',
  primarySoft: '#8E66FF',
  primaryBg: '#F1ECFF',
  gold: '#F9603B',
  goldBg: '#FFF0EA',
  text: '#17132B',
  muted: '#625D75',
  subtle: '#9C98AD',
  border: '#E8E5F0',
  bg: '#F7F6FB',
  card: '#FFFFFF',
  success: '#0B815A',
  successBg: '#E6F6EF',
  warning: '#B45309',
  warningBg: '#FEF3E2',
  danger: '#D92D20',
  dangerBg: '#FEECEA',
  info: '#1D4ED8',
  infoBg: '#E8F0FE',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: c.primary, soft: c.primarySoft },
        navy: { DEFAULT: c.navy, soft: c.navySoft },
        heroEnd: c.heroEnd,
        gold: { DEFAULT: c.gold, bg: c.goldBg },
        success: { DEFAULT: c.success, bg: c.successBg },
        warning: { DEFAULT: c.warning, bg: c.warningBg },
        danger: { DEFAULT: c.danger, bg: c.dangerBg },
        info: { DEFAULT: c.info, bg: c.infoBg },
        light: {
          DEFAULT: c.bg,
          card: c.card,
          border: c.border,
          muted: c.muted,
          subtle: c.subtle,
          text: c.text,
          primaryBg: c.primaryBg,
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 18px rgba(23, 19, 43, 0.07)',
        raised: '0 -6px 24px rgba(23, 19, 43, 0.14)',
        glow: '0 8px 14px rgba(109, 59, 245, 0.35)',
      },
    },
  },
  plugins: [],
};
