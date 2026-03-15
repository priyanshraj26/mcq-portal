import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* ─── Design tokens ─── */
const C = {
  bgBase: '#08080d',
  bgSurface: '#0e0e16',
  bgCard: '#111119',
  bgElevated: '#1a1a28',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderDefault: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(124,104,240,0.35)',
  violetDim: '#2a2060',
  violetMid: '#6d56e8',
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

/* ─── Scroll reveal ─── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(n);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, v };
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, v } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? 'translateY(0)' : 'translateY(36px)',
      transition: `opacity .75s cubic-bezier(.22,1,.36,1) ${delay}s, transform .75s cubic-bezier(.22,1,.36,1) ${delay}s`,
    }}>{children}</div>
  );
}

/* ─── Animated Hero Card ─── */
function AnimatedCard() {
  const [state, setState] = useState(0);
  useEffect(() => {
    const d = [3000, 1600, 2400];
    const t = setTimeout(() => setState(s => (s + 1) % 3), d[state]);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* glow */}
      <div className="absolute -inset-10 rounded-3xl blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${C.violetGlowStrong}, transparent 70%)`, animation: 'pulse-glow 4s ease-in-out infinite' }} />

      {/* gradient border wrapper */}
      <div className="relative rounded-2xl" style={{
        background: `linear-gradient(160deg, ${C.violetGlowStrong}, transparent 40%, transparent 60%, ${C.violetGlowStrong})`,
        padding: 1
      }}>
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
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ color: C.violetBright, backgroundColor: C.violetGlow }}>14:32</span>
                </div>
                <p className="text-sm mb-5 leading-relaxed font-medium" style={{ color: C.textPrimary }}>
                  What is the SI unit of electric charge?
                </p>
                <div className="space-y-2">
                  {['Ampere', 'Joule', 'Coulomb', 'Watt'].map((o, i) => {
                    const sel = state === 1 && i === 2;
                    return (
                      <div key={o} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-300"
                        style={{
                          border: `1px solid ${sel ? C.violetCore : C.borderDefault}`,
                          backgroundColor: sel ? C.violetGlowMed : 'transparent',
                          color: sel ? C.textPrimary : C.textSecondary,
                          transform: sel ? 'scale(1.02)' : 'scale(1)',
                        }}>
                        <span className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center transition-all duration-300"
                          style={{ border: `2px solid ${sel ? C.violetCore : 'rgba(255,255,255,0.12)'}`, backgroundColor: sel ? C.violetCore : 'transparent' }}>
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
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: C.violetGlow, border: `1px solid ${C.violetDim}` }}>
                  <span className="text-3xl font-bold" style={gradientText}>80%</span>
                </div>
                <span className="text-2xl font-bold mt-1" style={{ color: C.textPrimary }}>8 / 10</span>
                <span className="text-sm mt-1" style={{ color: C.textSecondary }}>Excellent performance</span>
                <span className="mt-5 rounded-xl px-5 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: C.violetCore }}>
                  View Analysis →
                </span>
              </div>
            )}
          </div>

          {/* progress indicator */}
          <div className="flex justify-center gap-1.5 mt-5 pt-4" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1 rounded-full transition-all duration-500"
                style={{ width: state === i ? 20 : 6, backgroundColor: state === i ? C.violetCore : 'rgba(255,255,255,0.08)' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature icons ─── */
const featureIcons = {
  document: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  clock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  layers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

const features = [
  { icon: featureIcons.document, title: 'Smart PDF Parsing', desc: 'Upload any standard PDF. Questions, options, and answers are detected automatically — anything uncertain is flagged for your review.' },
  { icon: featureIcons.clock, title: 'Flexible Timing', desc: 'Set a timer for the full paper, each section, or individual questions. Mix and match to replicate any real exam format.' },
  { icon: featureIcons.layers, title: 'Multi-Section Support', desc: 'Upload multiple PDFs at once. Each becomes its own section with a separate question bank and optional time limit.' },
  { icon: featureIcons.chart, title: 'Performance Analysis', desc: 'After every test, see section accuracy, time per question, slowest responses, and scores with negative marking applied.' },
];

/* ─── FAQ ─── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left font-medium text-sm sm:text-base group transition-colors"
        style={{ color: C.textPrimary }}
        onMouseEnter={e => (e.currentTarget.style.color = C.violetBright)}
        onMouseLeave={e => (e.currentTarget.style.color = C.textPrimary)}>
        {q}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 ml-4 transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', color: C.textMuted }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: open ? 200 : 0, opacity: open ? 1 : 0 }}>
        <p className="text-sm leading-relaxed pb-5" style={{ color: C.textSecondary }}>{a}</p>
      </div>
    </div>
  );
}


/* ─── Steps ─── */
const steps = [
  { num: '01', title: 'Upload your PDF', desc: 'Drag and drop one or multiple MCQ PDFs. Each file is parsed into a separate section with questions and answers extracted automatically.' },
  { num: '02', title: 'Configure the exam', desc: 'Set timing rules, scoring scheme, navigation options, and section order. Everything is adjustable to match any real exam.' },
  { num: '03', title: 'Test & review', desc: 'Take the exam in a distraction-free interface. On submit, receive a comprehensive analysis of every question, section, and time metric.' },
];

const faqs = [
  { q: 'What PDF formats are supported?', a: 'Any standard PDF with selectable text. Scanned image-only PDFs require OCR and are not yet supported. Low-confidence parses are flagged for your review.' },
  { q: 'Can I upload multiple PDFs for one exam?', a: 'Yes. Each PDF becomes a separate section. You can reorder, rename, and assign individual time limits to each one.' },
  { q: 'How does negative marking work?', a: 'Enable it in exam settings and set a deduction per wrong answer (default 0.25). Unanswered questions are never penalized.' },
  { q: 'What happens if I run out of time?', a: 'The exam auto-submits when the timer reaches zero. A 10-second warning appears beforehand. All selected answers are saved.' },
  { q: 'Is my progress saved if the browser closes?', a: 'Yes. Every answer is autosaved within 500ms. Reopening the exam restores your answers and remaining time.' },
  { q: 'Can I retake an exam?', a: 'Yes. Each attempt is saved as a separate session so you can compare performance over time from your dashboard.' },
];

/* ─── Main ─── */
export default function Home() {
  const scrollTo = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="page-enter" style={{ backgroundColor: C.bgBase }}>
      <style>{`
        @keyframes pulse-glow { 0%,100%{opacity:.5} 50%{opacity:.9} }
        @keyframes float-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(60px,-40px) scale(1.1)} }
        @keyframes float-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,50px) scale(1.05)} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .animate-fade-in { animation: fade-in-up .5s ease-out both; }
      `}</style>

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-screen overflow-hidden flex items-center">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* gradient orbs */}
          <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.14]"
            style={{ background: C.violetCore, top: '10%', left: '15%', animation: 'float-a 20s ease-in-out infinite' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.08]"
            style={{ background: '#a594f9', bottom: '10%', right: '20%', animation: 'float-b 16s ease-in-out infinite' }} />
          {/* dot grid */}
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          {/* top radial fade */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,104,240,0.06), transparent 60%)' }} />
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="text-center lg:text-left">
            {/* <Reveal>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full mb-8"
                style={{ backgroundColor: C.violetGlow, border: `1px solid ${C.violetDim}`, color: C.violetBright, letterSpacing: '0.08em' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.violetCore }} />
                Exam Practice Platform
              </span>
            </Reveal> */}

            <Reveal delay={0.08}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight" style={{ color: C.textPrimary }}>
                Practice any MCQ exam{' '}
                <span style={gradientText}>with precision.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-base sm:text-lg mt-6 leading-relaxed max-w-lg mx-auto lg:mx-0" style={{ color: C.textSecondary }}>
                Upload any MCQ PDF, configure your exam settings, take the test in a focused interface, and get a detailed breakdown of your performance, all in one place!
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-10 flex gap-4 flex-wrap justify-center lg:justify-start">
                <Link to="/test"
                  className="relative rounded-xl px-6 py-3 font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                  style={{ backgroundColor: C.violetCore, boxShadow: `0 0 32px ${C.violetGlowStrong}, 0 4px 16px rgba(0,0,0,0.3)` }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.violetMid)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.violetCore)}>
                  Start a Test
                  <span className="ml-2">→</span>
                </Link>
                <button onClick={scrollTo}
                  className="rounded-xl px-6 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ border: `1px solid rgba(255,255,255,0.12)`, color: C.textSecondary, backgroundColor: 'rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.violetCore; e.currentTarget.style.color = C.violetBright; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = C.textSecondary; }}>
                  See How It Works
                </button>
              </div>
            </Reveal>
          </div>

          {/* Right — animated card */}
          <Reveal delay={0.3} className="hidden lg:block">
            <AnimatedCard />
          </Reveal>
        </div>

        {/* bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${C.bgBase}, transparent)` }} />
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase mb-3 inline-block" style={{ color: C.violetBright }}>Features</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                Everything you need for a
                <br className="hidden sm:block" />
                <span style={gradientText}> focused exam experience</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.08}>
                <div className="group rounded-2xl p-6 sm:p-7 h-full transition-all duration-300 cursor-default"
                  style={{ backgroundColor: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = C.borderHover;
                    e.currentTarget.style.backgroundColor = C.bgCard;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px ${C.borderHover}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = C.borderSubtle;
                    e.currentTarget.style.backgroundColor = C.bgSurface;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                  <div className="rounded-xl w-10 h-10 flex items-center justify-center mb-5 transition-colors duration-300"
                    style={{ backgroundColor: C.violetGlow, border: `1px solid ${C.violetDim}`, color: C.violetBright }}>
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: C.textPrimary }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="py-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-xs font-semibold tracking-widest uppercase mb-3 inline-block" style={{ color: C.violetBright }}>How it works</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                Three steps from PDF to
                <span style={gradientText}> results</span>
              </h2>
            </div>
          </Reveal>

          {/* Desktop layout */}
          <div className="hidden md:block">
            <div className="relative grid grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <Reveal key={s.num} delay={i * 0.12}>
                  <div className="relative group">
                    {/* connector arrow to next card */}
                    {i < steps.length - 1 && (
                      <div className="absolute top-1/2 -right-3 -translate-y-1/2 z-10 flex items-center"
                        style={{ width: 24 }}>

                      </div>
                    )}

                    {/* card */}
                    <div className="rounded-2xl p-7 h-full transition-all duration-300"
                      style={{
                        backgroundColor: C.bgSurface,
                        border: `1px solid ${C.borderSubtle}`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = C.borderHover;
                        e.currentTarget.style.backgroundColor = C.bgCard;
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 12px 48px rgba(0,0,0,0.3), 0 0 0 1px ${C.borderHover}, 0 0 40px ${C.violetGlow}`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = C.borderSubtle;
                        e.currentTarget.style.backgroundColor = C.bgSurface;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}>
                      {/* top row: number + label */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `linear-gradient(135deg, ${C.violetGlowMed}, ${C.violetGlow})`, border: `1px solid ${C.violetDim}` }}>
                          <span className="text-sm font-bold" style={gradientText}>{s.num}</span>
                        </div>
                        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: C.violetBright, letterSpacing: '0.1em' }}>
                          Step {i + 1}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold mb-3" style={{ color: C.textPrimary }}>{s.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{s.desc}</p>

                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Mobile layout — vertical timeline */}
          <div className="md:hidden relative">
            {/* vertical line */}
            <div className="absolute left-[23px] top-8 bottom-8 w-px"
              style={{ background: `linear-gradient(180deg, ${C.violetDim}, ${C.violetCore}, ${C.violetDim})` }} />

            <div className="space-y-6">
              {steps.map((s, i) => (
                <Reveal key={s.num} delay={i * 0.1}>
                  <div className="relative flex gap-5">
                    {/* timeline node */}
                    <div className="shrink-0 relative z-10">
                      <div className="w-[46px] h-[46px] rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${C.violetGlowMed}, ${C.violetGlow})`,
                          border: `1px solid ${C.violetDim}`,
                          boxShadow: `0 0 20px ${C.violetGlow}, 0 0 0 4px ${C.bgBase}`,
                        }}>
                        <span className="text-sm font-bold" style={gradientText}>{s.num}</span>
                      </div>
                    </div>

                    {/* content card */}
                    <div className="flex-1 rounded-2xl p-5 pb-6"
                      style={{ backgroundColor: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}>
                      <span className="text-[10px] font-semibold tracking-widest uppercase mb-2 inline-block"
                        style={{ color: C.violetBright, letterSpacing: '0.1em' }}>
                        Step {i + 1}
                      </span>
                      <h3 className="text-base font-semibold mb-2" style={{ color: C.textPrimary }}>{s.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA BANNER ═══════ */}
      <section className="py-20 px-5 sm:px-8">
        <Reveal>
          <div className="relative max-w-4xl mx-auto rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
            style={{
              background: `linear-gradient(135deg, ${C.bgElevated} 0%, ${C.bgCard} 100%)`,
              border: `1px solid ${C.borderDefault}`,
            }}>
            {/* decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full blur-[100px] pointer-events-none"
              style={{ background: C.violetGlowMed }} />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: C.textPrimary }}>
                Ready to start practicing?
              </h2>
              <p className="text-base max-w-md mx-auto mb-8" style={{ color: C.textSecondary }}>
                Upload your first PDF and take a test in under a minute. No account required.
              </p>
              <Link to="/test"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold text-white text-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                style={{ backgroundColor: C.violetCore, boxShadow: `0 0 40px ${C.violetGlowStrong}, 0 4px 20px rgba(0,0,0,0.4)` }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.violetMid)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.violetCore)}>
                Get Started Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-xs font-semibold tracking-widest uppercase mb-3 inline-block" style={{ color: C.violetBright }}>FAQ</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                Frequently asked questions
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl p-1 sm:p-2" style={{ backgroundColor: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}>
              <div className="px-4 sm:px-6">
                {faqs.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      {/* <footer className="py-12 px-5 sm:px-8" style={{ borderTop: `1px solid ${C.borderSubtle}` }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.violetGlow, border: `1px solid ${C.violetDim}` }}>
              <span className="text-xs font-bold" style={{ color: C.violetBright }}>M</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>MCQ Portal</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: C.textMuted }}>
            <Link to="/test" className="transition-colors hover:text-white" style={{ color: C.textMuted }}>Take a Test</Link>
            <button onClick={scrollTo} className="transition-colors hover:text-white" style={{ color: C.textMuted }}>How It Works</button>
          </div>
          <span className="text-xs" style={{ color: C.textMuted }}>
            © {new Date().getFullYear()} MCQ Portal
          </span>
        </div>
      </footer> */}
    </div>
  );
}