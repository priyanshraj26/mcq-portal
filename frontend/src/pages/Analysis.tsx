import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalysis } from '../api/client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

interface QuestionResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  isSkipped: boolean;
  markedForReview: boolean;
  timeTakenSecs: number;
  sectionName: string;
}

interface SectionResult {
  sectionId: string;
  sectionName: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  timeTakenSecs: number;
  avgTimePerQuestion: number;
}

interface AnalysisData {
  sessionId: string;
  examTitle: string;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  positiveMarks: number;
  negativeMarks: number;
  netScore: number;
  passed: boolean | null;
  passingPercentage: number | null;
  timeTakenSecs: number;
  sections: SectionResult[];
  questions: QuestionResult[];
  timeAnalysis: {
    avgTimePerQuestion: number;
    timeDistribution: { range: string; count: number }[];
    fastestQuestions: { questionNumber: number; timeSecs: number }[];
    slowestQuestions: { questionNumber: number; timeSecs: number }[];
  };
  marksPerCorrect: number;
  negativeMarkValue: number;
  negativeMarkingEnabled: boolean;
}

const COLORS = ['#22c55e', '#ef4444', '#9ca3af'];

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'review'>('all');

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const data = await getAnalysis(sessionId);
        setAnalysis(data);
      } catch {
        toast.error('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading analysis...</p>
      </div>
    );
  }

  const donutData = [
    { name: 'Correct', value: analysis.totalCorrect },
    { name: 'Wrong', value: analysis.totalWrong },
    { name: 'Skipped', value: analysis.totalSkipped },
  ];

  const sectionBarData = analysis.sections.map((s) => ({
    name: s.sectionName.length > 12 ? s.sectionName.slice(0, 12) + '...' : s.sectionName,
    accuracy: Math.round(s.accuracy),
    correct: s.correct,
    wrong: s.wrong,
  }));

  const filteredQuestions = analysis.questions.filter((q) => {
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'wrong') return !q.isCorrect && !q.isSkipped;
    if (filter === 'skipped') return q.isSkipped;
    if (filter === 'review') return q.markedForReview;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{analysis.examTitle}</h1>
            <p className="text-gray-500">Exam Analysis</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <div className="bg-white rounded-xl border p-6 col-span-2">
            <h2 className="text-lg font-semibold mb-4">Score Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analysis.netScore} / {analysis.maxScore}
                </div>
                <div className="text-sm text-gray-500">Net Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{analysis.percentage}%</div>
                <div className="text-sm text-gray-500">Percentage</div>
              </div>
              <div className="text-center">
                {analysis.passed !== null ? (
                  <div className={`text-2xl font-bold ${analysis.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {analysis.passed ? 'PASSED' : 'FAILED'}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-400">--</div>
                )}
                <div className="text-sm text-gray-500">
                  {analysis.passingPercentage ? `Pass: ${analysis.passingPercentage}%` : 'No threshold'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{formatDuration(analysis.timeTakenSecs)}</div>
                <div className="text-sm text-gray-500">Time Taken</div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6 pt-4 border-t">
              <div className="text-center">
                <div className="text-xl font-semibold text-green-600">{analysis.totalCorrect}</div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-red-600">{analysis.totalWrong}</div>
                <div className="text-xs text-gray-500">Wrong</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-400">{analysis.totalSkipped}</div>
                <div className="text-xs text-gray-500">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-green-600">+{analysis.positiveMarks}</div>
                <div className="text-xs text-gray-500">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-red-600">-{analysis.negativeMarks}</div>
                <div className="text-xs text-gray-500">Negative</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-blue-600">{analysis.netScore}</div>
                <div className="text-xs text-gray-500">Net</div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-white rounded-xl border p-6 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section-wise Breakdown */}
        {analysis.sections.length > 1 && (
          <div className="bg-white rounded-xl border p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Section-wise Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {analysis.sections.map((s) => (
                  <div key={s.sectionId} className="border-b last:border-0 py-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800">{s.sectionName}</span>
                      <span className="text-sm text-gray-600">
                        {s.correct}/{s.totalQuestions} ({Math.round(s.accuracy)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${s.accuracy}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1">
                      <span className="text-green-600">{s.correct} correct</span>
                      <span className="text-red-600">{s.wrong} wrong</span>
                      <span>{s.skipped} skipped</span>
                      <span>Avg: {Math.round(s.avgTimePerQuestion)}s/q</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sectionBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="correct" fill="#22c55e" name="Correct" />
                    <Bar dataKey="wrong" fill="#ef4444" name="Wrong" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Time Analysis */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Time Analysis</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-semibold">{Math.round(analysis.timeAnalysis.avgTimePerQuestion)}s</div>
              <div className="text-xs text-gray-500">Avg per Question</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analysis.timeAnalysis.timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" name="Questions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Question-by-Question Review */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Question Review</h2>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              { key: 'correct', label: `Correct (${analysis.totalCorrect})` },
              { key: 'wrong', label: `Wrong (${analysis.totalWrong})` },
              { key: 'skipped', label: `Skipped (${analysis.totalSkipped})` },
              { key: 'review', label: `Marked for Review (${analysis.questions.filter(q => q.markedForReview).length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${
                  filter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div key={q.questionId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    Q{q.questionNumber} &middot; {q.sectionName}
                    {q.markedForReview && (
                      <span className="ml-2 text-purple-600">(Reviewed)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{q.timeTakenSecs}s</span>
                    {q.isCorrect && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Correct</span>
                    )}
                    {!q.isCorrect && !q.isSkipped && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Wrong</span>
                    )}
                    {q.isSkipped && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Skipped</span>
                    )}
                  </div>
                </div>

                <p className="text-gray-900 mb-3 whitespace-pre-wrap">{q.questionText}</p>

                <div className="space-y-1.5">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correctAnswerIndex;
                    const isSelected = idx === q.selectedIndex;
                    let bg = 'bg-gray-50';
                    if (isCorrect) bg = 'bg-green-50 border border-green-200';
                    else if (isSelected && !isCorrect) bg = 'bg-red-50 border border-red-200';

                    return (
                      <div key={idx} className={`flex items-start gap-2 px-3 py-1.5 rounded ${bg}`}>
                        <span className="font-medium text-sm w-6 text-gray-600">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span
                          className={`text-sm ${
                            isCorrect
                              ? 'text-green-800 font-medium'
                              : isSelected
                                ? 'text-red-800'
                                : 'text-gray-700'
                          }`}
                        >
                          {opt}
                          {isCorrect && ' (Correct)'}
                          {isSelected && !isCorrect && ' (Your answer)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
