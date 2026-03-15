import { useEffect, useState, useRef } from 'react';

interface Props {
  startedAt: Date;
  totalTimeLimitSecs: number | null;
  onTimeUp: () => void;
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TimerBar({ startedAt, totalTimeLimitSecs, onTimeUp }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const timeUpCalled = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const e = Math.floor((now - startedAt.getTime()) / 1000);
      setElapsed(e);

      if (totalTimeLimitSecs && e >= totalTimeLimitSecs && !timeUpCalled.current) {
        timeUpCalled.current = true;
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, totalTimeLimitSecs, onTimeUp]);

  const remaining = totalTimeLimitSecs ? Math.max(0, totalTimeLimitSecs - elapsed) : null;
  const percentRemaining = totalTimeLimitSecs ? (remaining! / totalTimeLimitSecs) * 100 : 100;

  let colorClass = '';
  let colorStyle: React.CSSProperties = { color: 'var(--exam-text-primary)' };
  if (totalTimeLimitSecs) {
    if (percentRemaining <= 10) { colorClass = 'animate-pulse'; colorStyle = { color: '#ef4444' }; }
    else if (percentRemaining <= 20) { colorStyle = { color: '#eab308' }; }
  }

  return (
    <div className={`font-mono text-xl font-bold ${colorClass}`} style={colorStyle}>
      {remaining !== null ? formatTime(remaining) : formatTime(elapsed)}
    </div>
  );
}
