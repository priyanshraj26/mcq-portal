import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Test', to: '/test' },
  { label: 'Home', to: '/' },
  { label: 'Code', to: null },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileOpen]);

  const isActive = (to: string) => location.pathname === to;

  return (
    <div ref={menuRef} className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pointer-events-none">
      {/* Desktop pill */}
      <nav
        className="hidden md:flex items-center rounded-full px-1.5 py-1.5 pointer-events-auto"
        style={{
          backgroundColor: 'rgba(18, 18, 28, 0.55)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {navItems.map((item) =>
          item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className="px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
              style={
                isActive(item.to)
                  ? {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#f0eeff',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }
                  : { color: '#8b87a8' }
              }
              onMouseEnter={(e) => {
                if (!isActive(item.to!)) e.currentTarget.style.color = '#f0eeff';
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.to!)) e.currentTarget.style.color = '#8b87a8';
              }}
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.label}
              className="px-5 py-1.5 rounded-full text-sm font-medium cursor-not-allowed relative group"
              style={{ color: '#555270' }}
            >
              {item.label}
              <span
                className="text-xs px-2.5 py-1 rounded-lg absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  backgroundColor: 'rgba(18,18,28,0.9)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#8b87a8',
                }}
              >
                Coming Soon
              </span>
            </span>
          )
        )}
      </nav>

      {/* Mobile hamburger */}
      <div className="md:hidden pointer-events-auto flex flex-col items-center">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-full flex flex-col items-center justify-center gap-1.5"
          style={{
            backgroundColor: 'rgba(18, 18, 28, 0.55)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-4 h-0.5 transition-transform duration-200 ${mobileOpen ? 'rotate-45 translate-y-[3px]' : ''}`}
            style={{ backgroundColor: '#9490b0' }}
          />
          <span
            className={`block w-4 h-0.5 transition-opacity duration-200 ${mobileOpen ? 'opacity-0' : ''}`}
            style={{ backgroundColor: '#9490b0' }}
          />
          <span
            className={`block w-4 h-0.5 transition-transform duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[3px]' : ''}`}
            style={{ backgroundColor: '#9490b0' }}
          />
        </button>

        {mobileOpen && (
          <div
            className="mt-2 rounded-2xl px-2 py-2 flex flex-col gap-0.5 min-w-[140px]"
            style={{
              backgroundColor: 'rgba(18, 18, 28, 0.75)',
              backdropFilter: 'blur(16px) saturate(1.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {navItems.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2 rounded-xl text-sm font-medium text-center transition-colors"
                  style={
                    isActive(item.to)
                      ? { backgroundColor: 'rgba(255,255,255,0.08)', color: '#f0eeff' }
                      : { color: '#8b87a8' }
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.label}
                  className="block px-4 py-2 rounded-xl text-sm font-medium cursor-not-allowed text-center"
                  style={{ color: '#555270' }}
                >
                  {item.label}
                </span>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
