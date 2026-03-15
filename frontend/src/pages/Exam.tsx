import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useExamStore from '../store/examStore';
import { getSession, saveAnswer, submitSession } from '../api/client';
import TimerBar from '../components/exam/TimerBar';
import NavigationGrid from '../components/exam/NavigationGrid';
import Calculator from '../components/exam/Calculator';
import toast from 'react-hot-toast';

export default function Exam() {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const store = useExamStore();
  const {
    sessionId,
    sections,
    settings,
    answers,
    currentSectionIdx,
    currentQuestionIdx,
    startedAt,
    examTitle,
    initSession,
    setAnswer,
    toggleReview,
    markCompleted,
    navigateTo,
    nextQuestion,
    prevQuestion,
    addTime,
  } = store;

  const [showCalculator, setShowCalculator] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const submittedRef = useRef(false);
  const questionStartTime = useRef(Date.now());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme
  const [examTheme, setExamTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('mcq-exam-theme') as 'light' | 'dark') || 'light';
  });
  const toggleTheme = () => {
    const next = examTheme === 'light' ? 'dark' : 'light';
    setExamTheme(next);
    localStorage.setItem('mcq-exam-theme', next);
  };

  // Load session if navigating directly
  useEffect(() => {
    if (!sessionId && paramSessionId) {
      (async () => {
        try {
          const data = await getSession(paramSessionId);
          initSession({
            sessionId: data.id,
            exam: data.exam,
            startedAt: data.startedAt,
            answers: data.answers,
          });
        } catch {
          toast.error('Failed to load session');
          navigate('/test');
        }
      })();
    }
  }, [paramSessionId, sessionId, initSession, navigate]);

  // Intercept browser back button
  useEffect(() => {
    if (!sessionId) return;
    window.history.pushState({ examGuard: true }, '');
    const handlePopState = () => {
      if (submittedRef.current) {
        navigate('/test', { replace: true });
      } else {
        window.history.pushState({ examGuard: true }, '');
        setShowLeaveWarning(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [sessionId, navigate]);

  // Warn on tab/window close during exam
  useEffect(() => {
    if (!sessionId) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId]);

  const currentSection = sections[currentSectionIdx];
  const currentQuestion = currentSection?.questions[currentQuestionIdx];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;

  // Track time on question
  const currentQuestionId = currentQuestion?.id;
  useEffect(() => {
    questionStartTime.current = Date.now();
    return () => {
      if (currentQuestionId) {
        const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
        if (elapsed > 0) {
          addTime(currentQuestionId, elapsed);
        }
      }
    };
  }, [currentSectionIdx, currentQuestionIdx, currentQuestionId, addTime]);

  // Autosave answer with debounce
  const debouncedSave = useCallback(
    (questionId: string, selectedIndex: number | null, markedForReview?: boolean, isCompleted?: boolean) => {
      if (!sessionId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
          await saveAnswer(sessionId, {
            questionId,
            selectedIndex,
            markedForReview,
            isCompleted,
            timeTakenSecs: elapsed,
          });
        } catch {
          // Silent fail for autosave
        }
      }, 500);
    },
    [sessionId]
  );

  const handleSelectOption = (idx: number) => {
    if (!currentQuestion) return;
    const newIndex = currentAnswer?.selectedIndex === idx ? null : idx;
    setAnswer(currentQuestion.id, newIndex);
    debouncedSave(currentQuestion.id, newIndex);
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    toggleReview(currentQuestion.id);
    debouncedSave(
      currentQuestion.id,
      currentAnswer?.selectedIndex ?? null,
      !currentAnswer?.markedForReview
    );
  };

  const handleMarkCompleted = () => {
    if (!currentQuestion) return;
    markCompleted(currentQuestion.id);
    debouncedSave(
      currentQuestion.id,
      currentAnswer?.selectedIndex ?? null,
      currentAnswer?.markedForReview,
      true
    );
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    setSubmitting(true);
    try {
      await submitSession(sessionId);
      submittedRef.current = true;
      const sid = sessionId;
      store.reset();
      toast.success('Exam submitted!');
      navigate(`/analysis/${sid}`, { replace: true });
    } catch {
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  const handleLeaveExam = () => {
    store.reset();
    navigate('/test', { replace: true });
  };

  const handleTimeUp = useCallback(() => {
    setShowTimeWarning(true);
    setTimeout(() => {
      setShowTimeWarning(false);
      handleSubmitRef.current();
    }, 10000);
  }, []);

  const isLastQuestion =
    currentSectionIdx === sections.length - 1 &&
    currentQuestionIdx === (currentSection?.questions.length || 1) - 1;

  const totalQuestions = store.getTotalQuestions();
  const answeredCount = store.getAnsweredCount();
  const markedCount = store.getMarkedCount();

  // Calculate global question number
  let globalQNum = currentQuestionIdx + 1;
  for (let i = 0; i < currentSectionIdx; i++) {
    globalQNum += sections[i].questions.length;
  }

  if (!sessionId || !currentSection || !currentQuestion || !startedAt) {
    return (
      <div className="min-h-screen bg-[var(--exam-bg)] flex items-center justify-center" data-exam-theme={examTheme}>
        <p className="text-[var(--exam-text-secondary)] text-lg font-body">Loading exam...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-body" data-exam-theme={examTheme} style={{ backgroundColor: 'var(--exam-bg)' }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between shadow-sm" style={{ backgroundColor: 'var(--exam-header-bg)', borderBottom: '1px solid var(--exam-header-border)' }}>
        <h1 className="text-lg font-semibold truncate max-w-[300px]" style={{ color: 'var(--exam-text-primary)' }}>{examTitle}</h1>
        <TimerBar
          startedAt={startedAt}
          totalTimeLimitSecs={settings?.totalTimeLimitSecs ?? null}
          onTimeUp={handleTimeUp}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-btn-secondary-text)', border: '1px solid var(--exam-border)' }}
            title="Calculator"
          >
            Calculator
          </button>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', border: '1px solid var(--exam-border)' }}
            title={examTheme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {examTheme === 'light' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--exam-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--exam-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Section tabs */}
      {sections.length > 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ backgroundColor: 'var(--exam-header-bg)', borderBottom: '1px solid var(--exam-header-border)' }}>
          {sections.map((s, idx) => {
            const sAnswered = s.questions.filter(
              (q) => answers.get(q.id)?.selectedIndex !== null && answers.get(q.id)?.selectedIndex !== undefined
            ).length;
            return (
              <button
                key={s.id}
                onClick={() => (settings?.allowNavigation ?? true) && navigateTo(idx, 0)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  idx === currentSectionIdx
                    ? 'bg-violet-core text-white'
                    : ''
                }`}
                style={idx !== currentSectionIdx ? { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' } : undefined}
              >
                {s.name} ({sAnswered}/{s.questions.length})
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl">
            {/* Question header */}
            <div className="text-sm mb-2" style={{ color: 'var(--exam-text-secondary)' }}>
              {currentSection.name} &middot; Question {currentQuestionIdx + 1} of{' '}
              {currentSection.questions.length}
            </div>

            {/* Question text */}
            <div className="rounded-lg p-6 mb-4" style={{ backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}>
              <h2 className="text-lg font-medium whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--exam-text-primary)' }}>
                Q{globalQNum}. {currentQuestion.questionText}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {(currentQuestion.options as string[]).map((opt, idx) => {
                const isSelected = currentAnswer?.selectedIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className="w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3"
                    style={{
                      backgroundColor: isSelected ? 'var(--exam-option-selected-bg)' : 'var(--exam-surface)',
                      borderColor: isSelected ? 'var(--exam-option-selected-border)' : 'var(--exam-border)',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--exam-option-hover)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--exam-surface)'; }}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        isSelected ? 'bg-violet-core text-white' : ''
                      }`}
                      style={!isSelected ? { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-text-secondary)' } : undefined}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="pt-1" style={{ color: 'var(--exam-text-primary)' }}>{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleToggleReview}
                disabled={currentAnswer?.selectedIndex === null || currentAnswer?.selectedIndex === undefined}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentAnswer?.markedForReview
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : ''
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                style={!currentAnswer?.markedForReview ? { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-btn-secondary-text)', border: '1px solid var(--exam-border)' } : undefined}
              >
                {currentAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>
              <button
                onClick={handleMarkCompleted}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentAnswer?.isCompleted
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : ''
                }`}
                style={!currentAnswer?.isCompleted ? { backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-btn-secondary-text)', border: '1px solid var(--exam-border)' } : undefined}
              >
                {currentAnswer?.isCompleted ? 'Completed' : 'Mark as Completed'}
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevQuestion}
                disabled={currentSectionIdx === 0 && currentQuestionIdx === 0}
                className="px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-btn-secondary-text)' }}
              >
                Previous
              </button>
              {isLastQuestion ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md transition-colors"
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-6 py-2.5 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-medium shadow-md transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Navigation Grid */}
        <div className="w-72 p-4 overflow-y-auto hidden lg:block" style={{ borderLeft: '1px solid var(--exam-border)', backgroundColor: 'var(--exam-nav-bg)' }}>
          <NavigationGrid
            sections={sections}
            currentSectionIdx={currentSectionIdx}
            currentQuestionIdx={currentQuestionIdx}
            answers={answers}
            onNavigate={navigateTo}
            allowNavigation={settings?.allowNavigation ?? true}
          />

          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full mt-4 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Calculator */}
      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

      {/* Submit confirmation modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--exam-text-primary)' }}>Submit Exam?</h3>
            <div className="space-y-2 mb-6 text-sm" style={{ color: 'var(--exam-text-secondary)' }}>
              <p>Answered: <strong>{answeredCount}</strong> / {totalQuestions}</p>
              <p>Not Answered: <strong>{totalQuestions - answeredCount}</strong></p>
              <p>Marked for Review: <strong>{markedCount}</strong></p>
              {totalQuestions - answeredCount > 0 && (
                <p className="text-yellow-500 font-medium mt-2">
                  You have {totalQuestions - answeredCount} unanswered question(s)!
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--exam-btn-secondary-bg)', color: 'var(--exam-btn-secondary-text)' }}
              >
                Continue Exam
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave warning modal */}
      {showLeaveWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--exam-text-primary)' }}>Leave Exam?</h3>
            <p className="mb-2" style={{ color: 'var(--exam-text-secondary)' }}>
              If you leave now, your exam will <strong>not</strong> be submitted and your answers will be lost.
            </p>
            <p className="text-red-500 text-sm font-medium mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="px-5 py-2.5 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-semibold"
              >
                Continue Exam
              </button>
              <button
                onClick={handleLeaveExam}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Leave Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time warning modal */}
      {showTimeWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center" style={{ backgroundColor: 'var(--exam-surface)', border: '1px solid var(--exam-border)' }}>
            <div className="text-4xl mb-3" style={{ color: 'var(--exam-text-primary)' }}>Time's Up!</div>
            <p style={{ color: 'var(--exam-text-secondary)' }}>Your exam will be auto-submitted in 10 seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
