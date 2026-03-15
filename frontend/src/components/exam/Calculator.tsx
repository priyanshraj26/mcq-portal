import { useState } from 'react';

const V = { surface: 'var(--t-surface)', border: 'var(--t-border)', text: 'var(--t-text)', textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)', btnSecBg: 'var(--t-btn-sec-bg)' };
const btnBase = 'w-12 h-10 rounded-md text-sm font-medium transition-colors';

export default function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [op, setOp] = useState<string | null>(null);
  const [prev, setPrev] = useState<number | null>(null);

  const digit = (d: string) => { if (waiting) { setDisplay(d); setWaiting(false); } else setDisplay(display === '0' ? d : display + d); };
  const decimal = () => { if (waiting) { setDisplay('0.'); setWaiting(false); return; } if (!display.includes('.')) setDisplay(display + '.'); };
  const clear = () => { setDisplay('0'); setOp(null); setPrev(null); setWaiting(false); };

  const perform = (nextOp: string) => {
    const cur = parseFloat(display);
    if (prev !== null && op) {
      let r = prev;
      if (op === '+') r = prev + cur; else if (op === '-') r = prev - cur; else if (op === '*') r = prev * cur; else if (op === '/') r = cur !== 0 ? prev / cur : 0;
      setDisplay(String(r)); setPrev(r);
    } else setPrev(cur);
    setOp(nextOp); setWaiting(true);
  };

  const calc = () => { if (!op || prev === null) return; perform('='); setOp(null); setPrev(null); };

  const fnStyle: React.CSSProperties = { backgroundColor: V.btnSecBg, color: V.textSec };
  const numStyle: React.CSSProperties = { backgroundColor: V.surface, color: V.text, border: `1px solid ${V.border}` };

  return (
    <div className="fixed top-20 right-8 rounded-xl shadow-2xl p-4 z-50" style={{ width: 280, backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold" style={{ color: V.textSec }}>Calculator</span>
        <button onClick={onClose} className="text-lg font-bold" style={{ color: V.textMut }}>&times;</button>
      </div>
      <div className="rounded-lg px-3 py-2 mb-3 text-right" style={{ backgroundColor: V.btnSecBg }}>
        <div className="text-xl font-mono truncate" style={{ color: V.text }}>{display}</div>
        {memory !== 0 && <div className="text-xs" style={{ color: V.textMut }}>M: {memory}</div>}
      </div>
      <div className="grid grid-cols-5 gap-1">
        <button onClick={() => setMemory(0)} className={btnBase} style={fnStyle}>MC</button>
        <button onClick={() => { setDisplay(String(memory)); setWaiting(true); }} className={btnBase} style={fnStyle}>MR</button>
        <button onClick={() => setMemory(memory + parseFloat(display))} className={btnBase} style={fnStyle}>M+</button>
        <button onClick={() => setMemory(memory - parseFloat(display))} className={btnBase} style={fnStyle}>M-</button>
        <button onClick={clear} className={`${btnBase} bg-red-500/15 text-red-400 hover:bg-red-500/25`}>C</button>

        <button onClick={() => setDisplay(String(Math.pow(parseFloat(display), 2)))} className={btnBase} style={fnStyle}>x&sup2;</button>
        <button onClick={() => setDisplay(String(Math.sqrt(parseFloat(display))))} className={btnBase} style={fnStyle}>&radic;</button>
        <button onClick={() => setDisplay(String(parseFloat(display) / 100))} className={btnBase} style={fnStyle}>%</button>
        <button onClick={() => setDisplay(String(-parseFloat(display)))} className={btnBase} style={fnStyle}>&plusmn;</button>
        <button onClick={() => perform('/')} className={`${btnBase} bg-violet-core/15 text-violet-bright hover:bg-violet-core/25`}>&divide;</button>

        {['7','8','9'].map(d => <button key={d} onClick={() => digit(d)} className={btnBase} style={numStyle}>{d}</button>)}
        <button onClick={() => perform('*')} className={`${btnBase} bg-violet-core/15 text-violet-bright hover:bg-violet-core/25`}>&times;</button>
        <button onClick={() => perform('-')} className={`${btnBase} bg-violet-core/15 text-violet-bright hover:bg-violet-core/25`}>-</button>

        {['4','5','6'].map(d => <button key={d} onClick={() => digit(d)} className={btnBase} style={numStyle}>{d}</button>)}
        <button onClick={() => perform('+')} className={`${btnBase} bg-violet-core/15 text-violet-bright hover:bg-violet-core/25`}>+</button>
        <div className="row-span-2"><button onClick={calc} className="w-12 h-[84px] rounded-md text-sm font-medium bg-violet-core text-white hover:bg-violet-mid">=</button></div>

        {['1','2','3'].map(d => <button key={d} onClick={() => digit(d)} className={btnBase} style={numStyle}>{d}</button>)}
        <button onClick={() => digit('0')} className="col-span-3 h-10 rounded-md text-sm font-medium" style={numStyle}>0</button>
        <button onClick={decimal} className={btnBase} style={numStyle}>.</button>
      </div>
    </div>
  );
}
