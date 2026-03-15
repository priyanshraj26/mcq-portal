import type { Section, AnswerState } from '../../store/examStore';

interface Props {
  sections: Section[];
  currentSectionIdx: number;
  currentQuestionIdx: number;
  answers: Map<string, AnswerState>;
  onNavigate: (sectionIdx: number, questionIdx: number) => void;
  allowNavigation: boolean;
}

export default function NavigationGrid({
  sections,
  currentSectionIdx,
  currentQuestionIdx,
  answers,
  onNavigate,
  allowNavigation,
}: Props) {
  const section = sections[currentSectionIdx];
  if (!section) return null;

  const sectionAnswered = section.questions.filter(
    (q) => answers.get(q.id)?.selectedIndex !== null && answers.get(q.id)?.selectedIndex !== undefined
  ).length;
  const sectionMarked = section.questions.filter(
    (q) => answers.get(q.id)?.markedForReview
  ).length;

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalAnswered = Array.from(answers.values()).filter((a) => a.selectedIndex !== null).length;
  const totalMarked = Array.from(answers.values()).filter((a) => a.markedForReview).length;

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}>
      {/* Section switcher */}
      {sections.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {sections.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => allowNavigation && onNavigate(idx, 0)}
              disabled={!allowNavigation && idx !== currentSectionIdx}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                idx === currentSectionIdx
                  ? 'bg-violet-core text-white'
                  : ''
              } ${!allowNavigation && idx !== currentSectionIdx ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={idx !== currentSectionIdx ? { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' } : undefined}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--exam-text-secondary)' }}>
        {section.name} ({section.questions.length} Qs)
      </h3>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {section.questions.map((q, idx) => {
          const answer = answers.get(q.id);
          const isCurrent = idx === currentQuestionIdx;
          const hasAnswer = answer?.selectedIndex !== null && answer?.selectedIndex !== undefined;
          const isReview = answer?.markedForReview;
          const isVisited = (answer?.visitCount ?? 0) > 0;

          let bgColor = '';
          let style: React.CSSProperties = { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' };
          if (isReview && hasAnswer) { bgColor = 'bg-purple-500 text-white'; style = {}; }
          else if (hasAnswer) { bgColor = 'bg-green-500 text-white'; style = {}; }
          else if (isVisited) { bgColor = 'bg-red-400 text-white'; style = {}; }

          return (
            <button
              key={q.id}
              onClick={() => allowNavigation && onNavigate(currentSectionIdx, idx)}
              disabled={!allowNavigation}
              className={`w-9 h-9 rounded-md text-sm font-semibold flex items-center justify-center transition-all ${bgColor} ${
                isCurrent ? 'ring-2 ring-violet-core ring-offset-1' : ''
              } ${!allowNavigation ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
              style={style}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-1 text-xs mb-4" style={{ color: 'var(--exam-text-muted)' }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-green-500" /> Answered
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-red-400" /> Visited / Not Answered
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-purple-500" /> Marked for Review
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', border: '1px solid var(--exam-border)' }} /> Not Visited
        </div>
      </div>

      {/* Stats */}
      <div className="pt-3 space-y-1 text-sm" style={{ borderTop: '1px solid var(--exam-border)', color: 'var(--exam-text-secondary)' }}>
        <p><strong>Section:</strong> {sectionAnswered}/{section.questions.length} answered, {sectionMarked} marked</p>
        <p className="text-xs" style={{ color: 'var(--exam-text-muted)' }}>
          Total: {totalAnswered}/{totalQuestions} answered, {totalMarked} marked
        </p>
      </div>
    </div>
  );
}
