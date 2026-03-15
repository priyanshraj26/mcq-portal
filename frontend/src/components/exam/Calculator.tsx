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

  const Button = ({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) => (
    <button
      onClick={onClick}
      className={`w-12 h-10 rounded-md text-sm font-medium transition-colors ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed top-20 right-8 bg-white border border-gray-300 rounded-xl shadow-2xl p-4 z-50"
      style={{ width: '280px' }}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold text-gray-600">Calculator</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg font-bold">
          &times;
        </button>
      </div>

      {/* Display */}
      <div className="bg-gray-100 rounded-lg px-3 py-2 mb-3 text-right">
        <div className="text-xl font-mono text-gray-900 truncate">{display}</div>
        {memory !== 0 && <div className="text-xs text-gray-400">M: {memory}</div>}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-5 gap-1">
        <Button label="MC" onClick={memClear} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="MR" onClick={memRecall} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="M+" onClick={memAdd} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="M-" onClick={memSub} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="C" onClick={clear} className="bg-red-100 text-red-700 hover:bg-red-200" />

        <Button label="x²" onClick={square} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="√" onClick={sqrt} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="%" onClick={percent} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="±" onClick={negate} className="bg-gray-100 text-gray-700 hover:bg-gray-200" />
        <Button label="÷" onClick={() => performOperation('/')} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

        <Button label="7" onClick={() => inputDigit('7')} className="bg-white border hover:bg-gray-50" />
        <Button label="8" onClick={() => inputDigit('8')} className="bg-white border hover:bg-gray-50" />
        <Button label="9" onClick={() => inputDigit('9')} className="bg-white border hover:bg-gray-50" />
        <Button label="×" onClick={() => performOperation('*')} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />
        <Button label="-" onClick={() => performOperation('-')} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />

        <Button label="4" onClick={() => inputDigit('4')} className="bg-white border hover:bg-gray-50" />
        <Button label="5" onClick={() => inputDigit('5')} className="bg-white border hover:bg-gray-50" />
        <Button label="6" onClick={() => inputDigit('6')} className="bg-white border hover:bg-gray-50" />
        <Button label="+" onClick={() => performOperation('+')} className="bg-blue-100 text-blue-700 hover:bg-blue-200" />
        <div className="row-span-2">
          <button
            onClick={calculate}
            className="w-12 h-[84px] rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            =
          </button>
        </div>

        <Button label="1" onClick={() => inputDigit('1')} className="bg-white border hover:bg-gray-50" />
        <Button label="2" onClick={() => inputDigit('2')} className="bg-white border hover:bg-gray-50" />
        <Button label="3" onClick={() => inputDigit('3')} className="bg-white border hover:bg-gray-50" />
        <button
          onClick={() => inputDigit('0')}
          className="col-span-3 h-10 rounded-md text-sm font-medium bg-white border hover:bg-gray-50"
        >
          0
        </button>
        <Button label="." onClick={inputDecimal} className="bg-white border hover:bg-gray-50" />
      </div>
    </div>
  );
}
