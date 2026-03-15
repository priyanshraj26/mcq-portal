import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, deleteExam } from '../api/client';
import toast from 'react-hot-toast';

interface ExamSummary {
  id: string; title: string; createdAt: string; totalQuestions: number;
  sectionCount: number; hasSettings: boolean;
  lastSession: { id: string; status: string; submittedAt: string | null } | null;
}

const V = {
  surface: 'var(--t-surface)', elevated: 'var(--t-elevated)',
  border: 'var(--t-border)', borderStrong: 'var(--t-border-strong)',
  text: 'var(--t-text)', textSec: 'var(--t-text-sec)', textMut: 'var(--t-text-mut)',
  btnSecBg: 'var(--t-btn-sec-bg)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ExamSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { (async () => { try { setExams(await getExams()); } catch { toast.error('Failed to load exams'); } finally { setLoading(false); } })(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteExam(deleteTarget.id); setExams((p) => p.filter((e) => e.id !== deleteTarget.id)); toast.success('Exam deleted'); }
    catch { toast.error('Failed to delete exam'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <div className="pt-20 pb-12 px-4 flex-1">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2" style={{ color: V.text }}>Your Exams</h1>
          <p style={{ color: V.textSec }}>Upload PDFs, configure exams, and test your knowledge</p>
        </div>

        <div className="flex justify-center mb-10">
          <button onClick={() => navigate('/upload')} className="bg-violet-core hover:bg-violet-mid text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors">+ Create New Exam</button>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-10" style={{ color: V.textMut }}>Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}`, color: V.textSec }}>
              <p className="text-lg">No exams yet. Upload a PDF to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div key={exam.id} className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200"
                  style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--t-border-strong)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--t-border)')}>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: V.text }}>{exam.title}</h3>
                    <div className="flex gap-4 text-sm mt-1" style={{ color: V.textMut }}>
                      <span>{exam.totalQuestions} questions</span>
                      <span>{exam.sectionCount} section{exam.sectionCount !== 1 ? 's' : ''}</span>
                      <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                    </div>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--t-correct-bg)', color: '#4ade80' }}>Completed</span>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => navigate(`/configure/${exam.id}`)} className="px-4 py-2 text-sm rounded-md font-medium transition-colors" style={{ backgroundColor: V.elevated, color: V.textSec, border: `1px solid ${V.border}` }}>Configure</button>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <button onClick={() => navigate(`/analysis/${exam.lastSession!.id}`)} className="px-4 py-2 text-sm rounded-md font-medium transition-colors" style={{ backgroundColor: 'var(--t-correct-bg)', color: '#4ade80', border: '1px solid var(--t-correct-border)' }}>View Analysis</button>
                    )}
                    <button onClick={() => setDeleteTarget(exam)} className="px-4 py-2 text-sm rounded-md font-medium transition-colors" style={{ backgroundColor: 'var(--t-wrong-bg)', color: '#f87171', border: '1px solid var(--t-wrong-border)' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{ backgroundColor: V.surface, border: `1px solid ${V.borderStrong}` }}>
            <h3 className="text-xl font-bold mb-3" style={{ color: V.text }}>Delete Exam?</h3>
            <p className="mb-1" style={{ color: V.textSec }}>Are you sure you want to delete <strong>{deleteTarget.title}</strong>?</p>
            <p className="text-sm mb-6" style={{ color: '#f87171' }}>This will permanently delete the exam, all questions, sessions, and analysis data.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 rounded-lg font-medium" style={{ backgroundColor: V.btnSecBg, color: V.textSec, border: `1px solid ${V.border}` }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Exam'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
