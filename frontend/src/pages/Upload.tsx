import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadPdfs, confirmUpload } from '../api/client';
import useExamStore, { type ParsedQuestion, type ParsedSection } from '../store/examStore';
import QuestionPreview from '../components/upload/QuestionPreview';
import toast from 'react-hot-toast';
import { ThemeToggle } from '../context/ThemeContext';

const V = {
  bg: 'var(--t-bg)', surface: 'var(--t-surface)', surfaceAlt: 'var(--t-surface-alt)',
  border: 'var(--t-border)', text: 'var(--t-text)', textSec: 'var(--t-text-sec)',
  textMut: 'var(--t-text-mut)', inputBg: 'var(--t-input-bg)', inputBorder: 'var(--t-input-border)',
  shadow: 'var(--t-shadow)',
};

export default function Upload() {
  const navigate = useNavigate();
  const { uploadId, parsedSections, setUploadResult, updateParsedQuestion, deleteParsedQuestion } = useExamStore();

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [confirming, setConfirming] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles.filter((f) => f.type === 'application/pdf')]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true });

  const handleParse = async () => {
    if (files.length === 0) { toast.error('Please add at least one PDF file'); return; }
    setUploading(true);
    try {
      const result = await uploadPdfs(files);
      setUploadResult(result.uploadId, result.sections);
      setExamTitle(files[0].name.replace(/\.pdf$/i, ''));
      setParsed(true);
      toast.success(`Parsed ${result.sections.reduce((s: number, sec: ParsedSection) => s + sec.questions.length, 0)} questions`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to parse PDFs'); }
    finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!uploadId) return;
    if (parsedSections.some((s) => s.questions.some((q) => q.confidence < 0.75))) { toast.error('Please resolve all flagged questions (red) before proceeding'); return; }
    setConfirming(true);
    try {
      const result = await confirmUpload({ uploadId, title: examTitle || 'Untitled Exam', sections: parsedSections });
      toast.success('Exam created successfully!');
      navigate(`/configure/${result.examId}`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to create exam'); }
    finally { setConfirming(false); }
  };

  const totalQuestions = parsedSections.reduce((s, sec) => s + sec.questions.length, 0);
  const flaggedCount = parsedSections.reduce((s, sec) => s + sec.questions.filter((q) => q.confidence < 0.75).length, 0);

  const pillBtn = (active: boolean): React.CSSProperties =>
    active ? { backgroundColor: '#7c68f0', color: '#fff' } : { backgroundColor: V.surfaceAlt, color: V.textSec, border: `1px solid ${V.border}` };

  // ── Upload view ──
  if (!parsed) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: V.bg }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/test')} className="text-sm font-medium" style={{ color: '#7c68f0' }}>&larr; Back to Home</button>
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold mb-6" style={{ color: V.text }}>Upload PDFs</h1>

          <div {...getRootProps()} className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors"
            style={{ borderColor: isDragActive ? '#7c68f0' : V.border, backgroundColor: isDragActive ? 'var(--t-option-hover)' : V.surface }}>
            <input {...getInputProps()} />
            <div className="text-5xl mb-4">📄</div>
            <p className="text-lg" style={{ color: V.textSec }}>{isDragActive ? 'Drop PDF files here...' : 'Drag & drop PDF files here, or click to browse'}</p>
            <p className="text-sm mt-2" style={{ color: V.textMut }}>Each PDF will become a separate section</p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold" style={{ color: V.textSec }}>Files ({files.length})</h3>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
                  <div><span style={{ color: V.text }}>{file.name}</span><span className="text-sm ml-2" style={{ color: V.textMut }}>({(file.size / 1024 / 1024).toFixed(1)} MB)</span></div>
                  <button onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <button onClick={handleParse} disabled={files.length === 0 || uploading} className="bg-violet-core hover:bg-violet-mid disabled:opacity-40 text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors">
              {uploading ? 'Parsing PDFs...' : 'Parse PDFs'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview view ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: V.bg }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setParsed(false)} className="text-sm font-medium" style={{ color: '#7c68f0' }}>&larr; Back to Upload</button>
          <ThemeToggle />
        </div>

        <h1 className="text-3xl font-bold mb-2" style={{ color: V.text }}>Review Parsed Questions</h1>
        <div className="flex items-center gap-4 mb-6">
          <span style={{ color: V.textSec }}>{totalQuestions} questions in {parsedSections.length} section(s)</span>
          {flaggedCount > 0 && <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--t-wrong-bg)', color: '#f87171' }}>{flaggedCount} flagged</span>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1" style={{ color: V.textSec }}>Exam Title</label>
          <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="w-full max-w-md px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} placeholder="Enter exam title" />
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'flagged'] as const).map((key) => (
            <button key={key} onClick={() => setFilter(key)} className="px-4 py-2 rounded-md text-sm font-medium transition-colors" style={pillBtn(filter === key)}>
              {key === 'all' ? 'Show All' : `Show Flagged Only (${flaggedCount})`}
            </button>
          ))}
        </div>

        {parsedSections.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setActiveSection(null)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={pillBtn(activeSection === null)}>All Sections</button>
            {parsedSections.map((section, sIdx) => {
              const sf = section.questions.filter((q) => q.confidence < 0.75).length;
              return (
                <button key={sIdx} onClick={() => setActiveSection(sIdx)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={pillBtn(activeSection === sIdx)}>
                  {section.sectionName} ({section.questions.length}){sf > 0 && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">{sf}</span>}
                </button>
              );
            })}
          </div>
        )}

        {parsedSections.map((section, sIdx) => ({ section, sIdx })).filter(({ sIdx }) => activeSection === null || activeSection === sIdx).map(({ section, sIdx }) => (
          <div key={sIdx} className="mb-8">
            <h2 className="text-xl font-semibold mb-3" style={{ color: V.text }}>Section: {section.sectionName}</h2>
            {section.parseWarnings.length > 0 && (
              <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                {section.parseWarnings.map((w, i) => <p key={i} className="text-sm" style={{ color: '#fbbf24' }}>{w}</p>)}
              </div>
            )}
            <div className="space-y-4">
              {section.questions.map((q, qIdx) => ({ q, qIdx })).filter(({ q }) => filter === 'all' || q.confidence < 0.75).map(({ q, qIdx }) => (
                <QuestionPreview key={q.id} question={q} onUpdate={(updated: ParsedQuestion) => updateParsedQuestion(sIdx, qIdx, updated)} onDelete={() => deleteParsedQuestion(sIdx, qIdx)} />
              ))}
            </div>
          </div>
        ))}

        <div className="sticky bottom-0 p-4 flex items-center justify-between -mx-4 px-8" style={{ backgroundColor: V.surface, borderTop: `1px solid ${V.border}` }}>
          <span style={{ color: V.textSec }}>{totalQuestions} questions ready{flaggedCount > 0 && ` (${flaggedCount} need review)`}</span>
          <button onClick={handleConfirm} disabled={confirming || flaggedCount > 0} className="bg-violet-core hover:bg-violet-mid disabled:opacity-40 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors">
            {confirming ? 'Creating Exam...' : 'Proceed to Configure Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
