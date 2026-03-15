import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, deleteExam } from '../api/client';
import toast from 'react-hot-toast';

interface ExamSummary {
  id: string;
  title: string;
  createdAt: string;
  totalQuestions: number;
  sectionCount: number;
  hasSettings: boolean;
  lastSession: { id: string; status: string; submittedAt: string | null } | null;
}

const C = {
  bgSurface: '#111118',
  bgElevated: '#18181f',
  borderSubtle: 'rgba(255,255,255,0.07)',
  borderDefault: 'rgba(255,255,255,0.10)',
  violetDim: '#3b3070',
  textPrimary: '#f0eeff',
  textSecondary: '#9490b0',
  textMuted: '#5c5878',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ExamSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExams = async () => {
    try {
      const data = await getExams();
      setExams(data);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExam(deleteTarget.id);
      setExams((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success('Exam deleted');
    } catch {
      toast.error('Failed to delete exam');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="pt-20 pb-12 px-4 flex-1">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2" style={{ color: C.textPrimary }}>
            Your Exams
          </h1>
          <p style={{ color: C.textSecondary }}>
            Upload PDFs, configure exams, and test your knowledge
          </p>
        </div>

        {/* Create New Exam */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => navigate('/upload')}
            className="bg-violet-core hover:bg-violet-mid text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors"
          >
            + Create New Exam
          </button>
        </div>

        {/* Exam List */}
        <div>
          {loading ? (
            <div className="text-center py-10" style={{ color: C.textMuted }}>Loading exams...</div>
          ) : exams.length === 0 ? (
            <div
              className="text-center py-10 rounded-xl"
              style={{ backgroundColor: C.bgSurface, border: `1px solid ${C.borderSubtle}`, color: C.textSecondary }}
            >
              <p className="text-lg">No exams yet. Upload a PDF to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-200"
                  style={{
                    backgroundColor: C.bgSurface,
                    border: `1px solid ${C.borderSubtle}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderDefault)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.borderSubtle)}
                >
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: C.textPrimary }}>
                      {exam.title}
                    </h3>
                    <div className="flex gap-4 text-sm mt-1" style={{ color: C.textMuted }}>
                      <span>{exam.totalQuestions} questions</span>
                      <span>{exam.sectionCount} section{exam.sectionCount !== 1 ? 's' : ''}</span>
                      <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                    </div>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <span
                        className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80' }}
                      >
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/configure/${exam.id}`)}
                      className="px-4 py-2 text-sm rounded-md font-medium transition-colors"
                      style={{ backgroundColor: C.bgElevated, color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c68f0'; e.currentTarget.style.color = '#a594f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderSubtle; e.currentTarget.style.color = C.textSecondary; }}
                    >
                      Configure
                    </button>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <button
                        onClick={() => navigate(`/analysis/${exam.lastSession!.id}`)}
                        className="px-4 py-2 text-sm rounded-md font-medium transition-colors"
                        style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.18)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(74,222,128,0.1)')}
                      >
                        View Analysis
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(exam)}
                      className="px-4 py-2 text-sm rounded-md font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.18)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.1)')}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div
            className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{ backgroundColor: C.bgSurface, border: `1px solid ${C.borderDefault}` }}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: C.textPrimary }}>Delete Exam?</h3>
            <p className="mb-1" style={{ color: C.textSecondary }}>
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
            </p>
            <p className="text-sm mb-6" style={{ color: '#f87171' }}>
              This will permanently delete the exam, all questions, sessions, and analysis data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: C.bgElevated, color: C.textSecondary, border: `1px solid ${C.borderSubtle}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
