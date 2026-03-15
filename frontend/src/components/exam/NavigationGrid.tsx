import type { Section, AnswerState } from '../../store/examStore';

interface Props {
  sections: Section[];
  currentSectionIdx: number;
  currentQuestionIdx: number;
  answers: Map<string, AnswerState>;
  onNavigate: (sectionIdx: number, questionIdx: number) => void;
  allowNavigation: boolean;
}

const V = { surface: 'var(--t-surface)', border: 'var(--t-border)', text: 'var(--t-text)', textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)', btnSecBg: 'var(--t-btn-sec-bg)' };

export default function NavigationGrid({ sections, currentSectionIdx, currentQuestionIdx, answers, onNavigate, allowNavigation }: Props) {
  const section = sections[currentSectionIdx];
  if (!section) return null;

  const sAnswered = section.questions.filter((q) => answers.get(q.id)?.selectedIndex != null).length;
  const sMarked = section.questions.filter((q) => answers.get(q.id)?.markedForReview).length;
  const totalQ = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalA = Array.from(answers.values()).filter((a) => a.selectedIndex !== null).length;
  const totalM = Array.from(answers.values()).filter((a) => a.markedForReview).length;

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {sections.map((s, idx) => (
            <button key={s.id} onClick={() => allowNavigation && onNavigate(idx, 0)} disabled={!allowNavigation && idx !== currentSectionIdx}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${idx === currentSectionIdx ? 'bg-violet-core text-white' : ''} ${!allowNavigation && idx !== currentSectionIdx ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={idx !== currentSectionIdx ? { backgroundColor: V.btnSecBg, color: V.textSec } : undefined}>{s.name}</button>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold mb-3" style={{ color: V.textSec }}>{section.name} ({section.questions.length} Qs)</h3>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {section.questions.map((q, idx) => {
          const a = answers.get(q.id);
          const cur = idx === currentQuestionIdx, has = a?.selectedIndex != null, rev = a?.markedForReview, vis = (a?.visitCount ?? 0) > 0;
          let cls = ''; let st: React.CSSProperties = { backgroundColor: V.btnSecBg, color: V.textSec };
          if (rev && has) { cls = 'bg-purple-500 text-white'; st = {}; }
          else if (has) { cls = 'bg-green-500 text-white'; st = {}; }
          else if (vis) { cls = 'bg-red-400 text-white'; st = {}; }
          return (
            <button key={q.id} onClick={() => allowNavigation && onNavigate(currentSectionIdx, idx)} disabled={!allowNavigation}
              className={`w-9 h-9 rounded-md text-sm font-semibold flex items-center justify-center transition-all ${cls} ${cur ? 'ring-2 ring-violet-core ring-offset-1' : ''} ${!allowNavigation ? 'cursor-not-allowed' : 'hover:opacity-80'}`} style={st}>{idx + 1}</button>
          );
        })}
      </div>

      <div className="space-y-1 text-xs mb-4" style={{ color: V.textMut }}>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /> Answered</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400" /> Visited / Not Answered</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-500" /> Marked for Review</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ backgroundColor: V.btnSecBg, border: `1px solid ${V.border}` }} /> Not Visited</div>
      </div>

      <div className="pt-3 space-y-1 text-sm" style={{ borderTop: `1px solid ${V.border}`, color: V.textSec }}>
        <p><strong>Section:</strong> {sAnswered}/{section.questions.length} answered, {sMarked} marked</p>
        <p className="text-xs" style={{ color: V.textMut }}>Total: {totalA}/{totalQ} answered, {totalM} marked</p>
      </div>
    </div>
  );
}
