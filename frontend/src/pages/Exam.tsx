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
          navigate('/');
        }
      })();
    }
  }, [paramSessionId, sessionId, initSession, navigate]);

  // Intercept browser back button
  useEffect(() => {
    if (!sessionId) return;

    // Push a dummy state so we can detect back navigation
    window.history.pushState({ examGuard: true }, '');

    const handlePopState = () => {
      if (submittedRef.current) {
        // Already submitted — go home
        navigate('/', { replace: true });
      } else {
        // Mid-exam — show leave warning, push state again to stay on page
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
    navigate('/', { replace: true });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading exam...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[300px]">{examTitle}</h1>
        <TimerBar
          startedAt={startedAt}
          totalTimeLimitSecs={settings?.totalTimeLimitSecs ?? null}
          onTimeUp={handleTimeUp}
        />
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          title="Calculator"
        >
          Calculator
        </button>
      </header>

      {/* Section tabs */}
      {sections.length > 1 && (
        <div className="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto">
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
            <div className="text-sm text-gray-500 mb-2">
              {currentSection.name} &middot; Question {currentQuestionIdx + 1} of{' '}
              {currentSection.questions.length}
            </div>

            {/* Question text */}
            <div className="bg-white rounded-lg border p-6 mb-4">
              <h2 className="text-lg font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
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
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-gray-800 pt-1">{opt}</span>
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {currentAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
              </button>
              <button
                onClick={handleMarkCompleted}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentAnswer?.isCompleted
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {currentAnswer?.isCompleted ? 'Completed' : 'Mark as Completed'}
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevQuestion}
                disabled={currentSectionIdx === 0 && currentQuestionIdx === 0}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Navigation Grid */}
        <div className="w-72 border-l bg-gray-50 p-4 overflow-y-auto hidden lg:block">
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Exam?</h3>
            <div className="space-y-2 mb-6 text-sm text-gray-600">
              <p>Answered: <strong>{answeredCount}</strong> / {totalQuestions}</p>
              <p>Not Answered: <strong>{totalQuestions - answeredCount}</strong></p>
              <p>Marked for Review: <strong>{markedCount}</strong></p>
              {totalQuestions - answeredCount > 0 && (
                <p className="text-yellow-600 font-medium mt-2">
                  You have {totalQuestions - answeredCount} unanswered question(s)!
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Leave Exam?</h3>
            <p className="text-gray-600 mb-2">
              If you leave now, your exam will <strong>not</strong> be submitted and your answers will be lost.
            </p>
            <p className="text-red-600 text-sm font-medium mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
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
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
            <div className="text-4xl mb-3">Time's Up!</div>
            <p className="text-gray-600 mb-2">Your exam will be auto-submitted in 10 seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
