import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExam, saveExamSettings, startSession } from '../api/client';
import useExamStore from '../store/examStore';
import toast from 'react-hot-toast';

interface SectionInfo {
  id: string;
  name: string;
  questionCount: number;
  timeLimitMins: string;
}

const light = {
  bg: '#f8f9fc', surface: '#ffffff', border: '#e2e5ee',
  text: '#1a1a2e', textSec: '#5a6080', textMut: '#9499b5',
  inputBg: '#ffffff', inputBorder: '#e2e5ee',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
};
const dark = {
  bg: '#08080d', surface: '#0e0e16', border: 'rgba(255,255,255,0.08)',
  text: '#eeecff', textSec: '#8b87a8', textMut: '#555270',
  inputBg: '#111119', inputBorder: 'rgba(255,255,255,0.10)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.3)',
};

export default function Configure() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { initSession } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState('');
  const [sections, setSections] = useState<SectionInfo[]>([]);

  const [overallTimeMins, setOverallTimeMins] = useState('');
  const [perQuestionTimeSecs, setPerQuestionTimeSecs] = useState('');
  const [marksPerCorrect, setMarksPerCorrect] = useState('1');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState('0.25');
  const [passingPercentage, setPassingPercentage] = useState('');
  const [allowNavigation, setAllowNavigation] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  const [isDark, setIsDark] = useState(() => (localStorage.getItem('mcq-configure-theme') || 'dark') === 'dark');
  const t = isDark ? dark : light;
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('mcq-configure-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const exam = await getExam(examId);
        setExamTitle(exam.title);
        setSections(
          exam.sections.map((s: any) => ({
            id: s.id,
            name: s.name,
            questionCount: s.questions.length,
            timeLimitMins: s.timeLimitSecs ? String(Math.floor(s.timeLimitSecs / 60)) : '',
          }))
        );
        if (exam.settings) {
          const s = exam.settings;
          if (s.totalTimeLimitSecs) setOverallTimeMins(String(Math.floor(s.totalTimeLimitSecs / 60)));
          if (s.perQuestionTimeSecs) setPerQuestionTimeSecs(String(s.perQuestionTimeSecs));
          setMarksPerCorrect(String(s.marksPerCorrect));
          setNegativeMarking(s.negativeMarking);
          setNegativeMarkValue(String(s.negativeMarkValue));
          if (s.passingPercentage) setPassingPercentage(String(s.passingPercentage));
          setAllowNavigation(s.allowNavigation);
          setShuffleQuestions(s.shuffleQuestions);
          setShuffleOptions(s.shuffleOptions);
        }
      } catch {
        toast.error('Failed to load exam');
      } finally {
        setLoading(false);
      }
    })();
  }, [examId]);

  const handleSave = async () => {
    if (!examId) return;
    try {
      await saveExamSettings(examId, {
        title: examTitle,
        totalTimeLimitSecs: overallTimeMins ? parseInt(overallTimeMins) * 60 : null,
        perQuestionTimeSecs: perQuestionTimeSecs ? parseInt(perQuestionTimeSecs) : null,
        marksPerCorrect: parseFloat(marksPerCorrect) || 1,
        negativeMarking,
        negativeMarkValue: parseFloat(negativeMarkValue) || 0.25,
        passingPercentage: passingPercentage ? parseFloat(passingPercentage) : null,
        allowNavigation,
        shuffleQuestions,
        shuffleOptions,
        sectionTimeLimits: sections.map((s) => ({
          sectionId: s.id,
          timeLimitSecs: s.timeLimitMins ? parseInt(s.timeLimitMins) * 60 : null,
        })),
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleStartExam = async () => {
    if (!examId) return;
    await handleSave();
    try {
      const session = await startSession(examId);
      initSession(session);
      navigate(`/exam/${session.sessionId}`);
    } catch {
      toast.error('Failed to start exam');
    }
  };

  // Shared styles
  const cardStyle: React.CSSProperties = { backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.cardShadow };
  const inputStyle: React.CSSProperties = { backgroundColor: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.text };
  const labelStyle: React.CSSProperties = { color: t.textSec };
  const headingStyle: React.CSSProperties = { color: t.text };
  const checkLabelStyle: React.CSSProperties = { color: t.textSec };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: t.bg }}>
        <p style={{ color: t.textMut }}>Loading exam configuration...</p>
      </div>
    );
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.bg }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/test')}
            className="text-sm font-medium transition-colors"
            style={{ color: '#7c68f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#a594f9')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#7c68f0')}
          >
            &larr; Back to Home
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f3f9', border: `1px solid ${t.border}` }}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.textSec} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6" style={headingStyle}>Configure Exam</h1>

        {/* Basic Settings */}
        <div className="rounded-xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={headingStyle}>Basic Settings</h2>
          <div>
            <label className="block text-sm font-medium mb-1" style={labelStyle}>Exam Title</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
              style={inputStyle}
            />
          </div>
          <p className="text-sm mt-2" style={{ color: t.textMut }}>{totalQuestions} questions in {sections.length} sections</p>
        </div>

        {/* Timing */}
        <div className="rounded-xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={headingStyle}>Timing Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Overall Time Limit (minutes)</label>
              <input
                type="number"
                value={overallTimeMins}
                onChange={(e) => setOverallTimeMins(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
                style={inputStyle}
                placeholder="No limit"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Per Question Timer (seconds)</label>
              <input
                type="number"
                value={perQuestionTimeSecs}
                onChange={(e) => setPerQuestionTimeSecs(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
                style={inputStyle}
                placeholder="No limit"
                min="0"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={labelStyle}>Per-Section Time Limits (minutes)</label>
            {sections.map((section, idx) => (
              <div key={section.id} className="flex items-center gap-3 mb-2">
                <span className="text-sm w-48 truncate" style={{ color: t.textSec }}>{section.name} ({section.questionCount} Qs)</span>
                <input
                  type="number"
                  value={section.timeLimitMins}
                  onChange={(e) => {
                    const updated = [...sections];
                    updated[idx] = { ...updated[idx], timeLimitMins: e.target.value };
                    setSections(updated);
                  }}
                  className="w-32 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-core"
                  style={inputStyle}
                  placeholder="No limit"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="rounded-xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={headingStyle}>Scoring Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Marks per Correct Answer</label>
              <input
                type="number"
                value={marksPerCorrect}
                onChange={(e) => setMarksPerCorrect(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
                style={inputStyle}
                step="0.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={labelStyle}>Passing Percentage</label>
              <input
                type="number"
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core"
                style={inputStyle}
                placeholder="No pass/fail"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-core"
              />
              <span className="text-sm font-medium" style={checkLabelStyle}>Enable Negative Marking</span>
            </label>
            {negativeMarking && (
              <div className="mt-2 ml-7">
                <label className="block text-sm mb-1" style={{ color: t.textMut }}>Marks Deducted per Wrong Answer</label>
                <input
                  type="number"
                  value={negativeMarkValue}
                  onChange={(e) => setNegativeMarkValue(e.target.value)}
                  className="w-40 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-core"
                  style={inputStyle}
                  step="0.25"
                  min="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation & Randomization */}
        <div className="rounded-xl p-6 mb-6" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={headingStyle}>Navigation & Randomization</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowNavigation}
                onChange={(e) => setAllowNavigation(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-core"
              />
              <span className="text-sm" style={checkLabelStyle}>Allow Back Navigation & Question Panel Navigation</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-core"
              />
              <span className="text-sm" style={checkLabelStyle}>Shuffle Question Order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 rounded accent-violet-core"
              />
              <span className="text-sm" style={checkLabelStyle}>Shuffle Options (A/B/C/D)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb', color: t.text, border: `1px solid ${t.border}` }}
          >
            Save Settings
          </button>
          <button
            onClick={handleStartExam}
            className="px-8 py-3 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-semibold shadow-md transition-colors"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
