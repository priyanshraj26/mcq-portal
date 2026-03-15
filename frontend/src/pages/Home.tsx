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

export default function Home() {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MCQ Test Portal</h1>
          <p className="text-gray-600 text-lg">Upload PDFs, configure exams, and test your knowledge</p>
        </div>

        {/* Create New Exam */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => navigate('/upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors"
          >
            + Create New Exam
          </button>
        </div>

        {/* Exam List */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Exams</h2>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-lg">No exams yet. Upload a PDF to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span>{exam.totalQuestions} questions</span>
                      <span>{exam.sectionCount} section{exam.sectionCount !== 1 ? 's' : ''}</span>
                      <span>{new Date(exam.createdAt).toLocaleDateString()}</span>
                    </div>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/configure/${exam.id}`)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                    >
                      Configure
                    </button>
                    {exam.lastSession?.status === 'SUBMITTED' && (
                      <button
                        onClick={() => navigate(`/analysis/${exam.lastSession!.id}`)}
                        className="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 rounded-md text-green-700 transition-colors"
                      >
                        View Analysis
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(exam)}
                      className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 rounded-md text-red-700 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Delete Exam?</h3>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently delete the exam, all questions, sessions, and analysis data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
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
