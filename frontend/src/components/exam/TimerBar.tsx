import { useEffect, useState, useRef } from 'react';

interface Props { startedAt: Date; totalTimeLimitSecs: number | null; onTimeUp: () => void; }

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const p = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export default function TimerBar({ startedAt, totalTimeLimitSecs, onTimeUp }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const called = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setElapsed(e);
      if (totalTimeLimitSecs && e >= totalTimeLimitSecs && !called.current) { called.current = true; onTimeUp(); }
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt, totalTimeLimitSecs, onTimeUp]);

  const rem = totalTimeLimitSecs ? Math.max(0, totalTimeLimitSecs - elapsed) : null;
  const pct = totalTimeLimitSecs ? (rem! / totalTimeLimitSecs) * 100 : 100;
  const color = totalTimeLimitSecs ? (pct <= 10 ? '#ef4444' : pct <= 20 ? '#eab308' : 'var(--t-text)') : 'var(--t-text)';

  return (
    <div className={`font-mono text-xl font-bold ${totalTimeLimitSecs && pct <= 10 ? 'animate-pulse' : ''}`} style={{ color }}>
      {rem !== null ? fmt(rem) : fmt(elapsed)}
    </div>
  );
}
