import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0B0F19',
        'bg-alt': '#0F172A',
        surface: '#161F30',
        'surface-hover': '#1E2B42',
        border: '#24324D',
        'border-light': '#334466',
        cyan: {
          DEFAULT: '#00F5D4',
          glow: '#06B6D4',
          dim: 'rgba(0,245,212,0.12)',
        },
        indigo: {
          DEFAULT: '#6366F1',
          dim: 'rgba(99,102,241,0.15)',
        },
        violet: {
          DEFAULT: '#8B5CF6',
          dim: 'rgba(139,92,246,0.15)',
        },
        amber: {
          DEFAULT: '#F59E0B',
          dim: 'rgba(245,158,11,0.15)',
        },
        rose: {
          DEFAULT: '#F43F5E',
          dim: 'rgba(244,63,94,0.15)',
        },
        emerald: {
          DEFAULT: '#10B981',
          dim: 'rgba(16,185,129,0.15)',
        },
        primary: '#00F5D4',
        'primary-dim': 'rgba(0,245,212,0.12)',
        accent: '#F8FAFC',
        muted: '#94A3B8',
        error: '#F43F5E',
        'error-dim': 'rgba(244,63,94,0.15)',
        warning: '#F59E0B',
        'warning-dim': 'rgba(245,158,11,0.15)',
        llm: '#8B5CF6',
        'llm-dim': 'rgba(139,92,246,0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 245, 212, 0.15)',
        'glow-lg': '0 0 35px rgba(0, 245, 212, 0.25)',
        'glow-rose': '0 0 20px rgba(244, 63, 94, 0.2)',
        'glow-indigo': '0 0 20px rgba(99, 102, 241, 0.2)',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

export default config;
