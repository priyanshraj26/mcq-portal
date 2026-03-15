import { useState, type JSX } from 'react';

const light = {
  bg: '#f8f9fc', surface: '#ffffff', surfaceAlt: '#f1f3f9',
  border: '#e2e5ee', borderStrong: '#d1d5e0',
  text: '#1a1a2e', textSec: '#5a6080', textMut: '#9499b5',
  inputBg: '#ffffff', inputBorder: '#e2e5ee',
  shadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const dark = {
  bg: '#08080d', surface: '#0e0e16', surfaceAlt: '#111119',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.12)',
  text: '#eeecff', textSec: '#8b87a8', textMut: '#555270',
  inputBg: '#111119', inputBorder: 'rgba(255,255,255,0.10)',
  shadow: '0 1px 3px rgba(0,0,0,0.3)',
};

export function usePageTheme(key: string) {
  const [isDark, setIsDark] = useState(() => (localStorage.getItem(key) || 'dark') === 'dark');
  const t = isDark ? dark : light;
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(key, next ? 'dark' : 'light');
  };
  return { isDark, t, toggleTheme };
}

export function ThemeToggle({ isDark, t, toggleTheme }: { isDark: boolean; t: typeof light; toggleTheme: () => void }): JSX.Element {
  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0"
      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f3f9', border: `1px solid ${t.border}` }}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
