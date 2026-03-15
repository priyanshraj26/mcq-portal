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

export default function Configure() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { initSession } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState('');
  const [sections, setSections] = useState<SectionInfo[]>([]);

  // Timing
  const [overallTimeMins, setOverallTimeMins] = useState('');
  const [perQuestionTimeSecs, setPerQuestionTimeSecs] = useState('');

  // Scoring
  const [marksPerCorrect, setMarksPerCorrect] = useState('1');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState('0.25');
  const [passingPercentage, setPassingPercentage] = useState('');

  // Navigation
  const [allowNavigation, setAllowNavigation] = useState(true);

  // Randomization
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading exam configuration...</p>
      </div>
    );
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          &larr; Back to Home
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Configure Exam</h1>

        {/* Basic Settings */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Basic Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">{totalQuestions} questions in {sections.length} sections</p>
        </div>

        {/* Timing */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Timing Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall Time Limit (minutes)</label>
              <input
                type="number"
                value={overallTimeMins}
                onChange={(e) => setOverallTimeMins(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="No limit"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Per Question Timer (seconds)</label>
              <input
                type="number"
                value={perQuestionTimeSecs}
                onChange={(e) => setPerQuestionTimeSecs(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="No limit"
                min="0"
              />
            </div>
          </div>

          {/* Per-section limits */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Per-Section Time Limits (minutes)</label>
            {sections.map((section, idx) => (
              <div key={section.id} className="flex items-center gap-3 mb-2">
                <span className="text-sm text-gray-600 w-48 truncate">{section.name} ({section.questionCount} Qs)</span>
                <input
                  type="number"
                  value={section.timeLimitMins}
                  onChange={(e) => {
                    const updated = [...sections];
                    updated[idx] = { ...updated[idx], timeLimitMins: e.target.value };
                    setSections(updated);
                  }}
                  className="w-32 px-3 py-1.5 border rounded-lg text-sm"
                  placeholder="No limit"
                  min="0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Scoring Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marks per Correct Answer</label>
              <input
                type="number"
                value={marksPerCorrect}
                onChange={(e) => setMarksPerCorrect(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                step="0.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Percentage</label>
              <input
                type="number"
                value={passingPercentage}
                onChange={(e) => setPassingPercentage(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
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
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Enable Negative Marking</span>
            </label>
            {negativeMarking && (
              <div className="mt-2 ml-7">
                <label className="block text-sm text-gray-600 mb-1">Marks Deducted per Wrong Answer</label>
                <input
                  type="number"
                  value={negativeMarkValue}
                  onChange={(e) => setNegativeMarkValue(e.target.value)}
                  className="w-40 px-3 py-1.5 border rounded-lg text-sm"
                  step="0.25"
                  min="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Navigation & Randomization */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Navigation & Randomization</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowNavigation}
                onChange={(e) => setAllowNavigation(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Allow Back Navigation & Question Panel Navigation</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Shuffle Question Order</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Shuffle Options (A/B/C/D)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={handleStartExam}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md transition-colors"
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
