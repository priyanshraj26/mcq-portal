import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAnalysis } from '../api/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { ThemeToggle, useTheme } from '../context/ThemeContext';

interface QuestionResult { questionId: string; questionNumber: number; questionText: string; options: string[]; correctAnswerIndex: number; selectedIndex: number | null; isCorrect: boolean; isSkipped: boolean; markedForReview: boolean; timeTakenSecs: number; sectionName: string; }
interface SectionResult { sectionId: string; sectionName: string; totalQuestions: number; correct: number; wrong: number; skipped: number; accuracy: number; timeTakenSecs: number; avgTimePerQuestion: number; }
interface AnalysisData { sessionId: string; examTitle: string; totalQuestions: number; totalCorrect: number; totalWrong: number; totalSkipped: number; totalScore: number; maxScore: number; percentage: number; positiveMarks: number; negativeMarks: number; netScore: number; passed: boolean | null; passingPercentage: number | null; timeTakenSecs: number; sections: SectionResult[]; questions: QuestionResult[]; timeAnalysis: { avgTimePerQuestion: number; timeDistribution: { range: string; count: number }[]; fastestQuestions: { questionNumber: number; timeSecs: number }[]; slowestQuestions: { questionNumber: number; timeSecs: number }[]; }; marksPerCorrect: number; negativeMarkValue: number; negativeMarkingEnabled: boolean; }

const COLORS = ['#4ade80', '#f87171', '#6b7280'];
const V = {
  bg: 'var(--t-bg)', surface: 'var(--t-surface)', surfaceAlt: 'var(--t-surface-alt)',
  border: 'var(--t-border)', text: 'var(--t-text)', textSec: 'var(--t-text-sec)',
  textMut: 'var(--t-text-mut)', shadow: 'var(--t-shadow)', chartGrid: 'var(--t-chart-grid)',
  btnSecBg: 'var(--t-btn-sec-bg)',
};
const card: React.CSSProperties = { backgroundColor: V.surface, border: `1px solid ${V.border}`, boxShadow: V.shadow };

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Analysis() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'review'>('all');

  const chartText = isDark ? '#8b87a8' : '#6b7280';
  const tooltipS = isDark ? { backgroundColor: '#1a1a28', border: '1px solid rgba(255,255,255,0.1)', color: '#eeecff' } : undefined;

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try { setAnalysis(await getAnalysis(sessionId)); }
      catch { toast.error('Failed to load analysis'); }
      finally { setLoading(false); }
    })();
  }, [sessionId]);

  if (loading || !analysis) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: V.bg }}><p style={{ color: V.textMut }}>Loading analysis...</p></div>
  );

  const donutData = [{ name: 'Correct', value: analysis.totalCorrect }, { name: 'Wrong', value: analysis.totalWrong }, { name: 'Skipped', value: analysis.totalSkipped }];
  const sectionBarData = analysis.sections.map((s) => ({ name: s.sectionName.length > 12 ? s.sectionName.slice(0, 12) + '...' : s.sectionName, correct: s.correct, wrong: s.wrong }));
  const filteredQuestions = analysis.questions.filter((q) => { if (filter === 'correct') return q.isCorrect; if (filter === 'wrong') return !q.isCorrect && !q.isSkipped; if (filter === 'skipped') return q.isSkipped; if (filter === 'review') return q.markedForReview; return true; });

  const pillBtn = (active: boolean): React.CSSProperties =>
    active ? { backgroundColor: '#7c68f0', color: '#fff' } : { backgroundColor: V.surfaceAlt, color: V.textSec, border: `1px solid ${V.border}` };

  return (
    <div className="min-h-screen" style={{ backgroundColor: V.bg }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: V.text }}>{analysis.examTitle}</h1>
            <p style={{ color: V.textMut }}>Exam Analysis</p>
          </div>
          <div className="flex gap-3 items-center">
            <ThemeToggle />
            <button onClick={() => navigate('/test')} className="px-5 py-2.5 rounded-lg font-medium transition-colors" style={{ backgroundColor: V.surfaceAlt, color: V.textSec, border: `1px solid ${V.border}` }}>Back to Home</button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl p-4 sm:p-6 lg:col-span-2" style={card}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Score Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { v: `${analysis.netScore} / ${analysis.maxScore}`, l: 'Net Score', c: '#7c68f0' },
                { v: `${analysis.percentage}%`, l: 'Percentage', c: V.text },
                { v: analysis.passed !== null ? (analysis.passed ? 'PASSED' : 'FAILED') : '--', l: analysis.passingPercentage ? `Pass: ${analysis.passingPercentage}%` : 'No threshold', c: analysis.passed === true ? '#4ade80' : analysis.passed === false ? '#f87171' : V.textMut },
                { v: formatDuration(analysis.timeTakenSecs), l: 'Time Taken', c: V.text },
              ].map((m) => (
                <div key={m.l} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold" style={{ color: m.c }}>{m.v}</div>
                  <div className="text-sm" style={{ color: V.textMut }}>{m.l}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mt-6 pt-4" style={{ borderTop: `1px solid ${V.border}` }}>
              {[
                { v: analysis.totalCorrect, l: 'Correct', c: '#4ade80' }, { v: analysis.totalWrong, l: 'Wrong', c: '#f87171' },
                { v: analysis.totalSkipped, l: 'Skipped', c: V.textMut }, { v: `+${analysis.positiveMarks}`, l: 'Positive', c: '#4ade80' },
                { v: `-${analysis.negativeMarks}`, l: 'Negative', c: '#f87171' }, { v: analysis.netScore, l: 'Net', c: '#7c68f0' },
              ].map((m) => (
                <div key={m.l} className="text-center">
                  <div className="text-xl font-semibold" style={{ color: m.c }}>{m.v}</div>
                  <div className="text-xs" style={{ color: V.textMut }}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={card}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`} stroke="none">{donutData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip contentStyle={tooltipS} /></PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section breakdown */}
        {analysis.sections.length > 1 && (
          <div className="rounded-xl p-6 mb-8" style={card}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Section-wise Performance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {analysis.sections.map((s) => (
                  <div key={s.sectionId} className="py-3" style={{ borderBottom: `1px solid ${V.border}` }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium" style={{ color: V.text }}>{s.sectionName}</span>
                      <span className="text-sm" style={{ color: V.textSec }}>{s.correct}/{s.totalQuestions} ({Math.round(s.accuracy)}%)</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--t-chart-grid)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${s.accuracy}%`, backgroundColor: '#7c68f0' }} />
                    </div>
                    <div className="flex gap-4 text-xs mt-1" style={{ color: V.textMut }}>
                      <span style={{ color: '#4ade80' }}>{s.correct} correct</span>
                      <span style={{ color: '#f87171' }}>{s.wrong} wrong</span>
                      <span>{s.skipped} skipped</span>
                      <span>Avg: {Math.round(s.avgTimePerQuestion)}s/q</span>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectionBarData}><CartesianGrid strokeDasharray="3 3" stroke="var(--t-chart-grid)" /><XAxis dataKey="name" fontSize={12} tick={{ fill: chartText }} /><YAxis tick={{ fill: chartText }} /><Tooltip contentStyle={tooltipS} /><Bar dataKey="correct" fill="#4ade80" name="Correct" radius={[4,4,0,0]} /><Bar dataKey="wrong" fill="#f87171" name="Wrong" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Time Analysis */}
        <div className="rounded-xl p-6 mb-8" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Time Analysis</h2>
          <div className="text-center mb-4">
            <div className="text-xl font-semibold" style={{ color: V.text }}>{Math.round(analysis.timeAnalysis.avgTimePerQuestion)}s</div>
            <div className="text-xs" style={{ color: V.textMut }}>Avg per Question</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analysis.timeAnalysis.timeDistribution}><CartesianGrid strokeDasharray="3 3" stroke="var(--t-chart-grid)" /><XAxis dataKey="range" fontSize={12} tick={{ fill: chartText }} /><YAxis tick={{ fill: chartText }} /><Tooltip contentStyle={tooltipS} /><Bar dataKey="count" fill="#7c68f0" name="Questions" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>

        {/* Question Review */}
        <div className="rounded-xl p-6" style={card}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: V.text }}>Question Review</h2>
          <div className="flex gap-1.5 sm:gap-2 mb-6 flex-wrap">
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'correct' as const, label: `Correct (${analysis.totalCorrect})` },
              { key: 'wrong' as const, label: `Wrong (${analysis.totalWrong})` },
              { key: 'skipped' as const, label: `Skipped (${analysis.totalSkipped})` },
              { key: 'review' as const, label: `Review (${analysis.questions.filter(q => q.markedForReview).length})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors" style={pillBtn(filter === key)}>{label}</button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div key={q.questionId} className="rounded-lg p-4" style={{ border: `1px solid ${V.border}` }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: V.textMut }}>
                    Q{q.questionNumber} &middot; {q.sectionName}
                    {q.markedForReview && <span className="ml-2" style={{ color: '#a78bfa' }}>(Reviewed)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: V.textMut }}>{q.timeTakenSecs}s</span>
                    {q.isCorrect && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--t-correct-bg)', color: '#4ade80' }}>Correct</span>}
                    {!q.isCorrect && !q.isSkipped && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--t-wrong-bg)', color: '#f87171' }}>Wrong</span>}
                    {q.isSkipped && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--t-neutral-bg)', color: V.textMut }}>Skipped</span>}
                  </div>
                </div>
                <p className="mb-3 whitespace-pre-wrap" style={{ color: V.text }}>{q.questionText}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, idx) => {
                    const isC = idx === q.correctAnswerIndex, isSel = idx === q.selectedIndex;
                    const bg: React.CSSProperties = isC ? { backgroundColor: 'var(--t-correct-bg)', border: '1px solid var(--t-correct-border)' } : (isSel && !isC) ? { backgroundColor: 'var(--t-wrong-bg)', border: '1px solid var(--t-wrong-border)' } : { backgroundColor: 'var(--t-neutral-bg)' };
                    return (
                      <div key={idx} className="flex items-start gap-2 px-3 py-1.5 rounded" style={bg}>
                        <span className="font-medium text-sm w-6" style={{ color: V.textMut }}>{String.fromCharCode(65 + idx)}.</span>
                        <span className="text-sm" style={{ color: isC ? '#4ade80' : isSel ? '#f87171' : V.textSec, fontWeight: isC ? 500 : 400 }}>
                          {opt}{isC && ' (Correct)'}{isSel && !isC && ' (Your answer)'}
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
