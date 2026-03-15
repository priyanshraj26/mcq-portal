import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalysis } from '../api/client';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { usePageTheme, ThemeToggle } from '../hooks/usePageTheme';

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

const COLORS = ['#4ade80', '#f87171', '#6b7280'];

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

  const { isDark, t, toggleTheme } = usePageTheme('mcq-analysis-theme');

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

  const cardStyle: React.CSSProperties = { backgroundColor: t.surface, border: `1px solid ${t.border}`, boxShadow: t.shadow };
  const chartGridColor = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
  const chartTextColor = isDark ? '#8b87a8' : '#6b7280';
  const tooltipStyle = isDark
    ? { backgroundColor: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', color: '#eeecff' }
    : undefined;

  if (loading || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: t.bg }}>
        <p style={{ color: t.textMut }}>Loading analysis...</p>
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

  const filterItems = [
    { key: 'all' as const, label: 'All' },
    { key: 'correct' as const, label: `Correct (${analysis.totalCorrect})` },
    { key: 'wrong' as const, label: `Wrong (${analysis.totalWrong})` },
    { key: 'skipped' as const, label: `Skipped (${analysis.totalSkipped})` },
    { key: 'review' as const, label: `Marked for Review (${analysis.questions.filter(q => q.markedForReview).length})` },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: t.bg }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: t.text }}>{analysis.examTitle}</h1>
            <p style={{ color: t.textMut }}>Exam Analysis</p>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle isDark={isDark} t={t} toggleTheme={toggleTheme} />
            <button
              onClick={() => navigate('/test')}
              className="px-5 py-2.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: t.surfaceAlt, color: t.textSec, border: `1px solid ${t.border}` }}
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Card */}
          <div className="rounded-xl p-6 col-span-2" style={cardStyle}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Score Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#7c68f0' }}>
                  {analysis.netScore} / {analysis.maxScore}
                </div>
                <div className="text-sm" style={{ color: t.textMut }}>Net Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: t.text }}>{analysis.percentage}%</div>
                <div className="text-sm" style={{ color: t.textMut }}>Percentage</div>
              </div>
              <div className="text-center">
                {analysis.passed !== null ? (
                  <div className={`text-2xl font-bold ${analysis.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {analysis.passed ? 'PASSED' : 'FAILED'}
                  </div>
                ) : (
                  <div className="text-2xl font-bold" style={{ color: t.textMut }}>--</div>
                )}
                <div className="text-sm" style={{ color: t.textMut }}>
                  {analysis.passingPercentage ? `Pass: ${analysis.passingPercentage}%` : 'No threshold'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: t.text }}>{formatDuration(analysis.timeTakenSecs)}</div>
                <div className="text-sm" style={{ color: t.textMut }}>Time Taken</div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
              <div className="text-center">
                <div className="text-xl font-semibold text-green-400">{analysis.totalCorrect}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Correct</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-red-400">{analysis.totalWrong}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Wrong</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold" style={{ color: t.textMut }}>{analysis.totalSkipped}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-green-400">+{analysis.positiveMarks}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Positive</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-red-400">-{analysis.negativeMarks}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Negative</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold" style={{ color: '#7c68f0' }}>{analysis.netScore}</div>
                <div className="text-xs" style={{ color: t.textMut }}>Net</div>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={cardStyle}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} stroke="none">
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section-wise Breakdown */}
        {analysis.sections.length > 1 && (
          <div className="rounded-xl p-6 mb-8" style={cardStyle}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Section-wise Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {analysis.sections.map((s) => (
                  <div key={s.sectionId} className="py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium" style={{ color: t.text }}>{s.sectionName}</span>
                      <span className="text-sm" style={{ color: t.textSec }}>
                        {s.correct}/{s.totalQuestions} ({Math.round(s.accuracy)}%)
                      </span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${s.accuracy}%`, backgroundColor: '#7c68f0' }} />
                    </div>
                    <div className="flex gap-4 text-xs mt-1" style={{ color: t.textMut }}>
                      <span className="text-green-400">{s.correct} correct</span>
                      <span className="text-red-400">{s.wrong} wrong</span>
                      <span>{s.skipped} skipped</span>
                      <span>Avg: {Math.round(s.avgTimePerQuestion)}s/q</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sectionBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="name" fontSize={12} tick={{ fill: chartTextColor }} />
                    <YAxis tick={{ fill: chartTextColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="correct" fill="#4ade80" name="Correct" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wrong" fill="#f87171" name="Wrong" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Time Analysis */}
        <div className="rounded-xl p-6 mb-8" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Time Analysis</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-semibold" style={{ color: t.text }}>{Math.round(analysis.timeAnalysis.avgTimePerQuestion)}s</div>
              <div className="text-xs" style={{ color: t.textMut }}>Avg per Question</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analysis.timeAnalysis.timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="range" fontSize={12} tick={{ fill: chartTextColor }} />
              <YAxis tick={{ fill: chartTextColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#7c68f0" name="Questions" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Question-by-Question Review */}
        <div className="rounded-xl p-6" style={cardStyle}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Question Review</h2>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {filterItems.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={
                  filter === key
                    ? { backgroundColor: '#7c68f0', color: '#fff' }
                    : { backgroundColor: t.surfaceAlt, color: t.textSec, border: `1px solid ${t.border}` }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div key={q.questionId} className="rounded-lg p-4" style={{ border: `1px solid ${t.border}` }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: t.textMut }}>
                    Q{q.questionNumber} &middot; {q.sectionName}
                    {q.markedForReview && (
                      <span className="ml-2" style={{ color: '#a78bfa' }}>(Reviewed)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: t.textMut }}>{q.timeTakenSecs}s</span>
                    {q.isCorrect && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>Correct</span>
                    )}
                    {!q.isCorrect && !q.isSkipped && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Wrong</span>
                    )}
                    {q.isSkipped && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: t.textMut }}>Skipped</span>
                    )}
                  </div>
                </div>

                <p className="mb-3 whitespace-pre-wrap" style={{ color: t.text }}>{q.questionText}</p>

                <div className="space-y-1.5">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correctAnswerIndex;
                    const isSelected = idx === q.selectedIndex;

                    let bgStyle: React.CSSProperties = { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' };
                    if (isCorrect) bgStyle = { backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' };
                    else if (isSelected && !isCorrect) bgStyle = { backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' };

                    return (
                      <div key={idx} className="flex items-start gap-2 px-3 py-1.5 rounded" style={bgStyle}>
                        <span className="font-medium text-sm w-6" style={{ color: t.textMut }}>
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span
                          className="text-sm"
                          style={{
                            color: isCorrect ? '#4ade80' : isSelected ? '#f87171' : t.textSec,
                            fontWeight: isCorrect ? 500 : 400,
                          }}
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
