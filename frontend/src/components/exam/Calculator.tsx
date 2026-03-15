import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export default function Calculator({ onClose }: Props) {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState(0);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [operator, setOperator] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setOperator(null);
    setPreviousValue(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOp: string) => {
    const current = parseFloat(display);

    if (previousValue !== null && operator) {
      let result = previousValue;
      switch (operator) {
        case '+': result = previousValue + current; break;
        case '-': result = previousValue - current; break;
        case '*': result = previousValue * current; break;
        case '/': result = current !== 0 ? previousValue / current : 0; break;
      }
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }

    setOperator(nextOp);
    setWaitingForOperand(true);
  };

  const calculate = () => {
    if (!operator || previousValue === null) return;
    performOperation('=');
    setOperator(null);
    setPreviousValue(null);
  };

  const percent = () => setDisplay(String(parseFloat(display) / 100));
  const sqrt = () => setDisplay(String(Math.sqrt(parseFloat(display))));
  const square = () => setDisplay(String(Math.pow(parseFloat(display), 2)));
  const negate = () => setDisplay(String(-parseFloat(display)));
  const memAdd = () => setMemory(memory + parseFloat(display));
  const memSub = () => setMemory(memory - parseFloat(display));
  const memRecall = () => { setDisplay(String(memory)); setWaitingForOperand(true); };
  const memClear = () => setMemory(0);

  const btnBase = 'w-12 h-10 rounded-md text-sm font-medium transition-colors';
  const btnFunc = `${btnBase}`;
  const btnDigit = `${btnBase}`;
  const btnOp = `${btnBase} bg-violet-core/15 text-violet-bright hover:bg-violet-core/25`;

  return (
    <div
      className="fixed top-20 right-8 rounded-xl shadow-2xl p-4 z-50"
      style={{ width: '280px', backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--exam-text-secondary)' }}>Calculator</span>
        <button onClick={onClose} className="text-lg font-bold" style={{ color: 'var(--exam-text-muted)' }}>
          &times;
        </button>
      </div>

      {/* Display */}
      <div className="rounded-lg px-3 py-2 mb-3 text-right" style={{ backgroundColor: 'var(--exam-btn-secondary-bg)' }}>
        <div className="text-xl font-mono truncate" style={{ color: 'var(--exam-text-primary)' }}>{display}</div>
        {memory !== 0 && <div className="text-xs" style={{ color: 'var(--exam-text-muted)' }}>M: {memory}</div>}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-5 gap-1">
        <button onClick={memClear} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>MC</button>
        <button onClick={memRecall} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>MR</button>
        <button onClick={memAdd} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>M+</button>
        <button onClick={memSub} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>M-</button>
        <button onClick={clear} className={`${btnBase} bg-red-500/15 text-red-400 hover:bg-red-500/25`}>C</button>

        <button onClick={square} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>x&sup2;</button>
        <button onClick={sqrt} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>&radic;</button>
        <button onClick={percent} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>%</button>
        <button onClick={negate} className={btnFunc} style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' }}>&plusmn;</button>
        <button onClick={() => performOperation('/')} className={btnOp}>&divide;</button>

        <button onClick={() => inputDigit('7')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>7</button>
        <button onClick={() => inputDigit('8')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>8</button>
        <button onClick={() => inputDigit('9')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>9</button>
        <button onClick={() => performOperation('*')} className={btnOp}>&times;</button>
        <button onClick={() => performOperation('-')} className={btnOp}>-</button>

        <button onClick={() => inputDigit('4')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>4</button>
        <button onClick={() => inputDigit('5')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>5</button>
        <button onClick={() => inputDigit('6')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>6</button>
        <button onClick={() => performOperation('+')} className={btnOp}>+</button>
        <div className="row-span-2">
          <button
            onClick={calculate}
            className="w-12 h-[84px] rounded-md text-sm font-medium bg-violet-core text-white hover:bg-violet-mid"
          >
            =
          </button>
        </div>

        <button onClick={() => inputDigit('1')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>1</button>
        <button onClick={() => inputDigit('2')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>2</button>
        <button onClick={() => inputDigit('3')} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>3</button>
        <button
          onClick={() => inputDigit('0')}
          className="col-span-3 h-10 rounded-md text-sm font-medium"
          style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}
        >
          0
        </button>
        <button onClick={inputDecimal} className={btnDigit} style={{ backgroundColor: 'var(--exam-surface)', color: 'var(--exam-text-primary)', border: '1px solid var(--exam-border)' }}>.</button>
      </div>
    </div>
  );
}
