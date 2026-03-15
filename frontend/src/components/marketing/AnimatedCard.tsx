import { useState, useEffect, useRef, useCallback } from 'react';

const C = {
  bgCard: '#111119',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderDefault: 'rgba(255,255,255,0.08)',
  violetDim: '#2a2060',
  violetCore: '#7c68f0',
  violetBright: '#a594f9',
  violetGlow: 'rgba(124,104,240,0.10)',
  violetGlowMed: 'rgba(124,104,240,0.20)',
  violetGlowStrong: 'rgba(124,104,240,0.30)',
  textPrimary: '#eeecff',
  textSecondary: '#8b87a8',
  textMuted: '#555270',
};

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, #e2d9ff 0%, #a594f9 50%, #7c68f0 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function AnimatedCard() {
  const [state, setState] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const rafRef = useRef<number>(0);

  // Auto-cycle states
  useEffect(() => {
    const d = [3000, 1600, 2400];
    const t = setTimeout(() => setState(s => (s + 1) % 3), d[state]);
    return () => clearTimeout(t);
  }, [state]);

  // 3D tilt on hover
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = cardRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTilt({
        x: (y - 0.5) * -14,  // tilt around X axis (vertical mouse = horizontal tilt)
        y: (x - 0.5) * 14,   // tilt around Y axis
      });
    });
  }, []);

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => {
    setHovering(false);
    setTilt({ x: 0, y: 0 });
  };

  const cardTransform = hovering
    ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
    : 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ perspective: 800 }}>
      {/* glow */}
      <div
        className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${C.violetGlowStrong}, transparent 70%)`,
          animation: 'pulse-glow 4s ease-in-out infinite',
          opacity: hovering ? 1 : 0.6,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* tilt wrapper */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
        style={{
          transform: cardTransform,
          transition: hovering ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* gradient border wrapper */}
        <div
          className="relative rounded-2xl"
          style={{
            background: `linear-gradient(160deg, ${C.violetGlowStrong}, transparent 40%, transparent 60%, ${C.violetGlowStrong})`,
            padding: 1,
          }}
        >
          <div className="rounded-2xl p-5 sm:p-6" style={{ backgroundColor: C.bgCard }}>
            {/* fake toolbar */}
            <div className="flex items-center gap-1.5 mb-5 pb-4" style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span className="text-[10px] ml-auto" style={{ color: C.textMuted }}>mcq-portal</span>
            </div>

            <div style={{ minHeight: 240 }}>
              {state < 2 ? (
                <div key="quiz" className="animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-medium tracking-wide uppercase" style={{ color: C.textMuted, letterSpacing: '0.06em' }}>
                      Physics · Q3 / 10
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ color: C.violetBright, backgroundColor: C.violetGlow }}>
                      14:32
                    </span>
                  </div>
                  <p className="text-sm mb-5 leading-relaxed font-medium" style={{ color: C.textPrimary }}>
                    What is the SI unit of electric charge?
                  </p>
                  <div className="space-y-2">
                    {['Ampere', 'Joule', 'Coulomb', 'Watt'].map((o, i) => {
                      const sel = state === 1 && i === 2;
                      return (
                        <div
                          key={o}
                          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300"
                          style={{
                            border: `1px solid ${sel ? C.violetCore : C.borderDefault}`,
                            backgroundColor: sel ? C.violetGlowMed : 'transparent',
                            color: sel ? C.textPrimary : C.textSecondary,
                            transform: sel ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-300"
                            style={{
                              border: `2px solid ${sel ? C.violetCore : 'rgba(255,255,255,0.12)'}`,
                              backgroundColor: sel ? C.violetCore : 'transparent',
                            }}
                          >
                            {sel && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          {o}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div key="result" className="flex flex-col items-center justify-center py-4 animate-fade-in">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: C.violetGlow, border: `1px solid ${C.violetDim}` }}
                  >
                    <span className="text-3xl font-bold" style={gradientText}>80%</span>
                  </div>
                  <span className="text-2xl font-bold mt-1" style={{ color: C.textPrimary }}>8 / 10</span>
                  <span className="text-sm mt-1" style={{ color: C.textSecondary }}>Excellent performance</span>
                  <span className="mt-5 rounded-xl px-5 py-2 text-sm font-medium text-white" style={{ backgroundColor: C.violetCore }}>
                    View Analysis →
                  </span>
                </div>
              )}
            </div>

            {/* progress indicator */}
            <div className="flex justify-center gap-1.5 mt-5 pt-4" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: state === i ? 20 : 6,
                    backgroundColor: state === i ? C.violetCore : 'rgba(255,255,255,0.08)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Specular highlight (moves with tilt) */}
        {hovering && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${50 + tilt.y * 3}% ${50 + tilt.x * -3}%, rgba(255,255,255,0.06), transparent 60%)`,
              transition: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
