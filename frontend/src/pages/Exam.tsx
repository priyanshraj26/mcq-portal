import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useExamStore from '../store/examStore';
import { getSession, saveAnswer, submitSession } from '../api/client';
import TimerBar from '../components/exam/TimerBar';
import NavigationGrid from '../components/exam/NavigationGrid';
import Calculator from '../components/exam/Calculator';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../context/ThemeContext';

const V = {
  bg: 'var(--t-bg)', surface: 'var(--t-surface)', border: 'var(--t-border)',
  text: 'var(--t-text)', textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)',
  optHover: 'var(--t-option-hover)', optSelBg: 'var(--t-option-sel-bg)',
  optSelBorder: 'var(--t-option-sel-border)', btnSecBg: 'var(--t-btn-sec-bg)',
  surfaceAlt: 'var(--t-surface-alt)',
};

export default function Exam() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const store = useExamStore();
  const { sessionId, sections, settings, answers, currentSectionIdx, currentQuestionIdx, startedAt, examTitle, initSession, setAnswer, toggleReview, markCompleted, navigateTo, nextQuestion, prevQuestion, addTime } = store;

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const submittedRef = useRef(false);
  const questionStartTime = useRef(Date.now());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId && paramSessionId) {
      (async () => {
        try { const data = await getSession(paramSessionId); initSession({ sessionId: data.id, exam: data.exam, startedAt: data.startedAt, answers: data.answers }); }
        catch { toast.error('Failed to load session'); navigate('/test'); }
      })();
    }
  }, [paramSessionId, sessionId, initSession, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    window.history.pushState({ examGuard: true }, '');
    const h = () => { if (submittedRef.current) navigate('/test', { replace: true }); else { window.history.pushState({ examGuard: true }, ''); setShowLeaveWarning(true); } };
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, [sessionId, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    const h = (e: BeforeUnloadEvent) => { if (!submittedRef.current) e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sessionId]);

  const currentSection = sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions[currentQuestionIdx];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;

  const currentQuestionId = currentQuestion?.id;
  useEffect(() => {
    questionStartTime.current = Date.now();
    return () => { if (currentQuestionId) { const e = Math.floor((Date.now() - questionStartTime.current) / 1000); if (e > 0) addTime(currentQuestionId, e); } };
  }, [currentSectionIdx, currentQuestionIdx, currentQuestionId, addTime]);

  const debouncedSave = useCallback((qId: string, sel: number | null, review?: boolean, done?: boolean) => {
    if (!sessionId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try { await saveAnswer(sessionId, { questionId: qId, selectedIndex: sel, markedForReview: review, isCompleted: done, timeTakenSecs: Math.floor((Date.now() - questionStartTime.current) / 1000) }); } catch {}
    }, 500);
  }, [sessionId]);

  const handleSelectOption = (idx: number) => { if (!currentQuestion) return; const n = currentAnswer?.selectedIndex === idx ? null : idx; setAnswer(currentQuestion.id, n); debouncedSave(currentQuestion.id, n); };
  const handleToggleReview = () => { if (!currentQuestion) return; toggleReview(currentQuestion.id); debouncedSave(currentQuestion.id, currentAnswer?.selectedIndex ?? null, !currentAnswer?.markedForReview); };
  const handleMarkCompleted = () => { if (!currentQuestion) return; markCompleted(currentQuestion.id); debouncedSave(currentQuestion.id, currentAnswer?.selectedIndex ?? null, currentAnswer?.markedForReview, true); };

  const handleSubmit = async () => {
    if (!sessionId) return; setSubmitting(true);
    try { await submitSession(sessionId); submittedRef.current = true; const sid = sessionId; store.reset(); toast.success('Exam submitted!'); navigate(`/analysis/${sid}`, { replace: true }); }
    catch { toast.error('Failed to submit exam'); }
    finally { setSubmitting(false); setShowSubmitModal(false); }
  };
  const handleSubmitRef = useRef(handleSubmit); handleSubmitRef.current = handleSubmit;
  const handleLeaveExam = () => { store.reset(); navigate('/test', { replace: true }); };
  const handleTimeUp = useCallback(() => { setShowTimeWarning(true); setTimeout(() => { setShowTimeWarning(false); handleSubmitRef.current(); }, 10000); }, []);

  const isLastQ = currentSectionIdx === sections.length - 1 && currentQuestionIdx === (currentSection?.questions.length || 1) - 1;
  const totalQ = store.getTotalQuestions(), answeredC = store.getAnsweredCount(), markedC = store.getMarkedCount();
  let globalQNum = currentQuestionIdx + 1;
  for (let i = 0; i < currentSectionIdx; i++) globalQNum += sections[i].questions.length;

  if (!sessionId || !currentSection || !currentQuestion || !startedAt) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: V.bg }}><p style={{ color: V.textMut }}>Loading exam...</p></div>;
  }

  const modal = (content: React.ReactNode) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>{content}</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: V.bg }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between shadow-sm" style={{ backgroundColor: V.surface, borderBottom: `1px solid ${V.border}` }}>
        <h1 className="text-lg font-semibold truncate max-w-[300px]" style={{ color: V.text }}>{examTitle}</h1>
        <TimerBar startedAt={startedAt} totalTimeLimitSecs={settings?.totalTimeLimitSecs ?? null} onTimeUp={handleTimeUp} />
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCalculator(!showCalculator)} className="px-3 py-2 rounded-md text-sm font-medium transition-colors" style={{ backgroundColor: V.btnSecBg, color: V.text, border: `1px solid ${V.border}` }}>Calculator</button>
          <ThemeToggle />
        </div>
      </header>

      {/* Section tabs */}
      {sections.length > 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ backgroundColor: V.surface, borderBottom: `1px solid ${V.border}` }}>
          {sections.map((s, idx) => {
            const n = s.questions.filter((q) => answers.get(q.id)?.selectedIndex != null).length;
            return <button key={s.id} onClick={() => (settings?.allowNavigation ?? true) && navigateTo(idx, 0)} className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${idx === currentSectionIdx ? 'bg-violet-core text-white' : ''}`} style={idx !== currentSectionIdx ? { backgroundColor: V.btnSecBg, color: V.textSec } : undefined}>{s.name} ({n}/{s.questions.length})</button>;
          })}
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl">
            <div className="text-sm mb-2" style={{ color: V.textSec }}>{currentSection.name} &middot; Question {currentQuestionIdx + 1} of {currentSection.questions.length}</div>
            <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
              <h2 className="text-lg font-medium whitespace-pre-wrap leading-relaxed" style={{ color: V.text }}>Q{globalQNum}. {currentQuestion.questionText}</h2>
            </div>

            <div className="space-y-3 mb-6">
              {(currentQuestion.options as string[]).map((opt, idx) => {
                const sel = currentAnswer?.selectedIndex === idx;
                return (
                  <button key={idx} onClick={() => handleSelectOption(idx)} className="w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3"
                    style={{ backgroundColor: sel ? V.optSelBg : V.surface, borderColor: sel ? V.optSelBorder : V.border }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.backgroundColor = V.optHover; }}
                    onMouseLeave={(e) => { if (!sel) e.currentTarget.style.backgroundColor = V.surface; }}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${sel ? 'bg-violet-core text-white' : ''}`} style={!sel ? { backgroundColor: V.btnSecBg, color: V.textSec } : undefined}>{String.fromCharCode(65 + idx)}</span>
                    <span className="pt-1" style={{ color: V.text }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <button onClick={handleToggleReview} disabled={currentAnswer?.selectedIndex == null}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentAnswer?.markedForReview ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                style={!currentAnswer?.markedForReview ? { backgroundColor: V.btnSecBg, color: V.text, border: `1px solid ${V.border}` } : undefined}>
                {currentAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>
              <button onClick={handleMarkCompleted}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentAnswer?.isCompleted ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}`}
                style={!currentAnswer?.isCompleted ? { backgroundColor: V.btnSecBg, color: V.text, border: `1px solid ${V.border}` } : undefined}>
                {currentAnswer?.isCompleted ? 'Completed' : 'Mark as Completed'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={prevQuestion} disabled={currentSectionIdx === 0 && currentQuestionIdx === 0} className="px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style={{ backgroundColor: V.btnSecBg, color: V.text }}>Previous</button>
              {isLastQ ? <button onClick={() => setShowSubmitModal(true)} className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md transition-colors">Submit Exam</button>
                : <button onClick={nextQuestion} className="px-6 py-2.5 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-medium shadow-md transition-colors">Next</button>}
            </div>
          </div>
        </div>

        <div className="w-72 p-4 overflow-y-auto hidden lg:block" style={{ borderLeft: `1px solid ${V.border}`, backgroundColor: V.surfaceAlt }}>
          <NavigationGrid sections={sections} currentSectionIdx={currentSectionIdx} currentQuestionIdx={currentQuestionIdx} answers={answers} onNavigate={navigateTo} allowNavigation={settings?.allowNavigation ?? true} />
          <button onClick={() => setShowSubmitModal(true)} className="w-full mt-4 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">Submit Exam</button>
        </div>
      </div>

      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

      {showSubmitModal && modal(<>
        <h3 className="text-xl font-bold mb-4" style={{ color: V.text }}>Submit Exam?</h3>
        <div className="space-y-2 mb-6 text-sm" style={{ color: V.textSec }}>
          <p>Answered: <strong>{answeredC}</strong> / {totalQ}</p><p>Not Answered: <strong>{totalQ - answeredC}</strong></p><p>Marked for Review: <strong>{markedC}</strong></p>
          {totalQ - answeredC > 0 && <p className="text-yellow-500 font-medium mt-2">You have {totalQ - answeredC} unanswered question(s)!</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowSubmitModal(false)} className="px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: V.btnSecBg, color: V.text }}>Continue Exam</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50">{submitting ? 'Submitting...' : 'Confirm Submit'}</button>
        </div>
      </>)}

      {showLeaveWarning && modal(<>
        <h3 className="text-xl font-bold mb-3" style={{ color: V.text }}>Leave Exam?</h3>
        <p className="mb-2" style={{ color: V.textSec }}>If you leave now, your exam will <strong>not</strong> be submitted and your answers will be lost.</p>
        <p className="text-red-500 text-sm font-medium mb-6">This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowLeaveWarning(false)} className="px-5 py-2.5 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-semibold">Continue Exam</button>
          <button onClick={handleLeaveExam} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Leave Exam</button>
        </div>
      </>)}

      {showTimeWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
            <div className="text-4xl mb-3" style={{ color: V.text }}>Time's Up!</div>
            <p style={{ color: V.textSec }}>Your exam will be auto-submitted in 10 seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
