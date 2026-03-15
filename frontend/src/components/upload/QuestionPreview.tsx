import { useState } from 'react';
import type { ParsedQuestion } from '../../store/examStore';

interface Props {
  question: ParsedQuestion;
  onUpdate: (q: ParsedQuestion) => void;
  onDelete: () => void;
}

const V = {
  surface: 'var(--t-surface)', border: 'var(--t-border)', text: 'var(--t-text)',
  textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)',
  inputBg: 'var(--t-input-bg)', inputBorder: 'var(--t-input-border)',
  btnSecBg: 'var(--t-btn-sec-bg)', neutralBg: 'var(--t-neutral-bg)',
};

const confStyle = (c: number): React.CSSProperties =>
  c >= 0.9 ? { backgroundColor: 'var(--t-correct-bg)', color: '#4ade80' }
  : c >= 0.75 ? { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
  : { backgroundColor: 'var(--t-wrong-bg)', color: '#f87171' };

export default function QuestionPreview({ question, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editQ, setEditQ] = useState(question);

  const handleSave = () => { onUpdate({ ...editQ, confidence: 1.0, flags: [] }); setEditing(false); };
  const handleCancel = () => { setEditQ(question); setEditing(false); };

  if (editing) {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: V.surface, border: '2px solid #7c68f0' }}>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Question Text</label>
          <textarea value={editQ.questionText} onChange={(e) => setEditQ({ ...editQ, questionText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
            style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} rows={3} />
        </div>
        {editQ.options.map((opt, idx) => (
          <div key={idx} className="mb-2 flex items-center gap-2">
            <input type="radio" checked={editQ.correctAnswerIndex === idx} onChange={() => setEditQ({ ...editQ, correctAnswerIndex: idx })} className="mt-0.5 accent-violet-core" />
            <span className="text-sm font-medium w-6" style={{ color: V.textMut }}>{String.fromCharCode(65 + idx)}.</span>
            <input type="text" value={opt} onChange={(e) => { const o = [...editQ.options]; o[idx] = e.target.value; setEditQ({ ...editQ, options: o }); }}
              className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-core"
              style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} />
          </div>
        ))}
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} className="px-4 py-2 bg-violet-core text-white rounded-lg text-sm hover:bg-violet-mid">Save</button>
          <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: V.btnSecBg, color: V.textSec }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl transition-colors" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold shrink-0" style={{ color: V.textMut }}>Q{question.questionNumber}</span>
          <span className="text-xs px-2 py-0.5 rounded shrink-0" style={confStyle(question.confidence)}>{Math.round(question.confidence * 100)}%</span>
          {question.flags.map((flag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{flag.replace(/_/g, ' ')}</span>
          ))}
          <span className="text-sm truncate ml-1" style={{ color: V.textSec }}>{question.questionText.length > 80 ? question.questionText.slice(0, 80) + '...' : question.questionText}</span>
        </div>
        <span className="shrink-0 ml-2" style={{ color: V.textMut }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-3" style={{ borderTop: `1px solid ${V.border}` }}>
          <div className="flex justify-end gap-1 mb-3">
            <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="text-sm px-2" style={{ color: '#7c68f0' }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-sm px-2" style={{ color: '#f87171' }}>Delete</button>
          </div>
          <p className="mb-3 whitespace-pre-wrap" style={{ color: V.text }}>{question.questionText}</p>
          <div className="space-y-1.5">
            {question.options.map((opt, idx) => {
              const isCorrect = idx === question.correctAnswerIndex;
              return (
                <div key={idx} className="flex items-start gap-2 px-3 py-1.5 rounded-lg"
                  style={isCorrect ? { backgroundColor: 'var(--t-correct-bg)', border: '1px solid var(--t-correct-border)' } : { backgroundColor: V.neutralBg }}>
                  <span className="font-medium text-sm min-w-[20px]" style={{ color: V.textMut }}>{String.fromCharCode(65 + idx)}.</span>
                  <span className="text-sm" style={{ color: isCorrect ? '#4ade80' : V.textSec, fontWeight: isCorrect ? 500 : 400 }}>{opt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
