import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExam, saveExamSettings, startSession } from '../api/client';
import useExamStore from '../store/examStore';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../context/ThemeContext';

interface SectionInfo {
  id: string;
  name: string;
  questionCount: number;
  timeLimitMins: string;
}

const V = {
  bg: 'var(--t-bg)', surface: 'var(--t-surface)', border: 'var(--t-border)',
  text: 'var(--t-text)', textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)',
  inputBg: 'var(--t-input-bg)', inputBorder: 'var(--t-input-border)', shadow: 'var(--t-shadow)',
  btnSecBg: 'var(--t-btn-sec-bg)',
};

const card: React.CSSProperties = { backgroundColor: V.surface, border: `1px solid ${V.border}`, boxShadow: V.shadow };
const input: React.CSSProperties = { backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text };

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

  useEffect(() => {
    if (!examId) return;
    (async () => {
      try {
        const exam = await getExam(examId);
        setExamTitle(exam.title);
        setSections(exam.sections.map((s: any) => ({ id: s.id, name: s.name, questionCount: s.questions.length, timeLimitMins: s.timeLimitSecs ? String(Math.floor(s.timeLimitSecs / 60)) : '' })));
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
      } catch { toast.error('Failed to load exam'); }
      finally { setLoading(false); }
    })();
  }, [examId]);

  const handleSave = async () => {
    if (!examId) return;
    try {
      await saveExamSettings(examId, {
        title: examTitle,
        totalTimeLimitSecs: overallTimeMins ? parseInt(overallTimeMins) * 60 : null,
        perQuestionTimeSecs: perQuestionTimeSecs ? parseInt(perQuestionTimeSecs) : null,
        marksPerCorrect: parseFloat(marksPerCorrect) || 1, negativeMarking,
        negativeMarkValue: parseFloat(negativeMarkValue) || 0.25,
        passingPercentage: passingPercentage ? parseFloat(passingPercentage) : null,
        allowNavigation, shuffleQuestions, shuffleOptions,
        sectionTimeLimits: sections.map((s) => ({ sectionId: s.id, timeLimitSecs: s.timeLimitMins ? parseInt(s.timeLimitMins) * 60 : null })),
      });
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
  };

  const handleStartExam = async () => {
    if (!examId) return;
    await handleSave();
    try {
      const session = await startSession(examId);
      initSession(session);
      navigate(`/exam/${session.sessionId}`);
    } catch { toast.error('Failed to start exam'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: V.bg }}>
        <p style={{ color: V.textMut }}>Loading exam configuration...</p>
      </div>
    );
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: V.bg }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/test')} className="text-sm font-medium" style={{ color: '#7c68f0' }}>&larr; Back to Home</button>
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-bold mb-6" style={{ color: V.text }}>Configure Exam</h1>

        {/* Basic */}
        <div className="rounded-xl p-6 mb-6" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Basic Settings</h2>
          <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Exam Title</label>
          <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} />
          <p className="text-sm mt-2" style={{ color: V.textMut }}>{totalQuestions} questions in {sections.length} sections</p>
        </div>

        {/* Timing */}
        <div className="rounded-xl p-6 mb-6" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Timing Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Overall Time Limit (minutes)</label>
              <input type="number" value={overallTimeMins} onChange={(e) => setOverallTimeMins(e.target.value)} className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} placeholder="No limit" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Per Question Timer (seconds)</label>
              <input type="number" value={perQuestionTimeSecs} onChange={(e) => setPerQuestionTimeSecs(e.target.value)} className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} placeholder="No limit" min="0" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2" style={{ color: V.textSec }}>Per-Section Time Limits (minutes)</label>
            {sections.map((section, idx) => (
              <div key={section.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-3">
                <span className="text-sm w-full sm:w-48 truncate" style={{ color: V.textSec }}>{section.name} ({section.questionCount} Qs)</span>
                <input type="number" value={section.timeLimitMins} onChange={(e) => { const u = [...sections]; u[idx] = { ...u[idx], timeLimitMins: e.target.value }; setSections(u); }} className="w-full sm:w-32 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} placeholder="No limit" min="0" />
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="rounded-xl p-6 mb-6" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Scoring Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Marks per Correct Answer</label>
              <input type="number" value={marksPerCorrect} onChange={(e) => setMarksPerCorrect(e.target.value)} className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} step="0.5" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Passing Percentage</label>
              <input type="number" value={passingPercentage} onChange={(e) => setPassingPercentage(e.target.value)} className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} placeholder="No pass/fail" min="0" max="100" />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} className="w-4 h-4 rounded accent-violet-core" />
              <span className="text-sm font-medium" style={{ color: V.textSec }}>Enable Negative Marking</span>
            </label>
            {negativeMarking && (
              <div className="mt-2 ml-7">
                <label className="block text-sm mb-1" style={{ color: V.textMut }}>Marks Deducted per Wrong Answer</label>
                <input type="number" value={negativeMarkValue} onChange={(e) => setNegativeMarkValue(e.target.value)} className="w-40 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-core" style={input} step="0.25" min="0" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="rounded-xl p-6 mb-6" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Navigation & Randomization</h2>
          <div className="space-y-3">
            {[
              { checked: allowNavigation, set: setAllowNavigation, label: 'Allow Back Navigation & Question Panel Navigation' },
              { checked: shuffleQuestions, set: setShuffleQuestions, label: 'Shuffle Question Order' },
              { checked: shuffleOptions, set: setShuffleOptions, label: 'Shuffle Options (A/B/C/D)' },
            ].map(({ checked, set, label }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="w-4 h-4 rounded accent-violet-core" />
                <span className="text-sm" style={{ color: V.textSec }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <button onClick={handleSave} className="px-6 py-3 rounded-lg font-semibold transition-colors" style={{ backgroundColor: V.btnSecBg, color: V.text, border: `1px solid ${V.border}` }}>Save Settings</button>
          <button onClick={handleStartExam} className="px-8 py-3 bg-violet-core hover:bg-violet-mid text-white rounded-lg font-semibold shadow-md transition-colors">Start Exam</button>
        </div>
      </div>
    </div>
  );
}
