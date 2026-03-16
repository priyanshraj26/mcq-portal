import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadPdfs, confirmUpload, aiParse } from '../api/client';
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

interface UploadedFile {
  file: File;
  name: string;
  pageCount: number | null;
  requiresPageRange: boolean;
  pageRange: { from: number; to: number } | null;
  pageRangeError: string | null;
}

async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

export default function Upload() {
  const navigate = useNavigate();
  const { uploadId, parsedSections, setUploadResult, updateParsedQuestion, deleteParsedQuestion, setSectionQuestions } = useExamStore();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [confirming, setConfirming] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParsingSection, setAiParsingSection] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(f => f.type === 'application/pdf');
    const newFiles: UploadedFile[] = pdfFiles.map(f => ({
      file: f, name: f.name, pageCount: null,
      requiresPageRange: false, pageRange: null, pageRangeError: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);

    // Check page counts asynchronously
    for (let i = 0; i < pdfFiles.length; i++) {
      try {
        const pageCount = await getPdfPageCount(pdfFiles[i]);
        setFiles(prev => prev.map(f =>
          f.file === pdfFiles[i] ? {
            ...f,
            pageCount,
            requiresPageRange: pageCount > 40,
            pageRange: pageCount > 40 ? { from: 1, to: Math.min(40, pageCount) } : null,
          } : f
        ));
      } catch { /* page count will remain null */ }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true });

  const updatePageRange = (index: number, field: 'from' | 'to', value: number) => {
    setFiles(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const range = { ...(f.pageRange || { from: 1, to: 40 }), [field]: value };
      let error: string | null = null;
      if (range.from < 1) error = 'Start page must be at least 1';
      else if (range.to > (f.pageCount || 999)) error = `End page exceeds ${f.pageCount} pages`;
      else if (range.to < range.from) error = 'End must be >= start';
      else if (range.to - range.from + 1 > 40) error = 'Max 40 pages allowed';
      return { ...f, pageRange: range, pageRangeError: error };
    }));
  };

  const canParse = files.length > 0 && !uploading &&
    files.every(f => !f.requiresPageRange || (f.pageRange && !f.pageRangeError));

  const handleParse = async () => {
    if (!canParse) return;
    setUploading(true);
    try {
      const rawFiles = files.map(f => f.file);
      const pageRanges: Record<number, { from: number; to: number }> = {};
      files.forEach((f, i) => { if (f.pageRange) pageRanges[i] = f.pageRange; });

      const result = await uploadPdfs(rawFiles, pageRanges);
      setUploadResult(result.uploadId, result.sections);
      setExamTitle(files[0].name.replace(/\.pdf$/i, ''));
      setParsed(true);
      toast.success(`Parsed ${result.sections.reduce((s: number, sec: ParsedSection) => s + sec.questions.length, 0)} questions`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to parse PDFs'); }
    finally { setUploading(false); }
  };

  const handleAiParse = async (sectionIndex: number, mode: 'compact' | 'full') => {
    if (!uploadId) return;
    setIsAiParsing(true);
    setAiParsingSection(sectionIndex);
    try {
      const response = await aiParse(uploadId, sectionIndex, mode);
      setSectionQuestions(sectionIndex, response.questions);
      toast.success(`AI parsing complete — ${response.questions.length} questions`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'AI parsing failed. Please try again.');
    } finally {
      setIsAiParsing(false);
      setAiParsingSection(null);
    }
  };

  const handleConfirm = async () => {
    if (!uploadId) return;
    if (parsedSections.some(s => s.questions.some(q => q.confidence < 0.75))) {
      toast.error('Please resolve all flagged questions (red) before proceeding');
      return;
    }
    setConfirming(true);
    try {
      const result = await confirmUpload({ uploadId, title: examTitle || 'Untitled Exam', sections: parsedSections });
      toast.success('Exam created successfully!');
      navigate(`/configure/${result.examId}`);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to create exam'); }
    finally { setConfirming(false); }
  };

  const totalQuestions = parsedSections.reduce((s, sec) => s + sec.questions.length, 0);
  const flaggedCount = parsedSections.reduce((s, sec) => s + sec.questions.filter(q => q.confidence < 0.75).length, 0);

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

          <div {...getRootProps()} className="border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer transition-colors"
            style={{ borderColor: isDragActive ? '#7c68f0' : V.border, backgroundColor: isDragActive ? 'var(--t-option-hover)' : V.surface }}>
            <input {...getInputProps()} />
            <div className="text-3xl sm:text-5xl mb-4">📄</div>
            <p className="text-base sm:text-lg" style={{ color: V.textSec }}>{isDragActive ? 'Drop PDF files here...' : 'Drag & drop PDF files here, or click to browse'}</p>
            <p className="text-sm mt-2" style={{ color: V.textMut }}>Each PDF will become a separate section</p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold" style={{ color: V.textSec }}>Files ({files.length})</h3>
              {files.map((f, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: V.surface, border: `1px solid ${V.border}` }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate" style={{ color: V.text }}>{f.name}</span>
                      <span className="text-sm shrink-0" style={{ color: V.textMut }}>({(f.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                      {f.pageCount !== null && (
                        <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: V.surfaceAlt, color: V.textMut }}>{f.pageCount} pages</span>
                      )}
                    </div>
                    <button onClick={() => setFiles(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-sm shrink-0 ml-2">Remove</button>
                  </div>
                  {f.requiresPageRange && (
                    <div className="mt-1 p-3 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: '#fbbf24' }}>
                        This PDF has {f.pageCount} pages. Select a range of up to 40 pages to parse.
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-xs" style={{ color: '#fbbf24' }}>From page</label>
                        <input type="number" min={1} max={f.pageCount ?? 999}
                          value={f.pageRange?.from ?? 1}
                          onChange={e => updatePageRange(idx, 'from', parseInt(e.target.value) || 1)}
                          className="w-16 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-core"
                          style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} />
                        <label className="text-xs" style={{ color: '#fbbf24' }}>to</label>
                        <input type="number" min={1} max={f.pageCount ?? 999}
                          value={f.pageRange?.to ?? Math.min(40, f.pageCount ?? 40)}
                          onChange={e => updatePageRange(idx, 'to', parseInt(e.target.value) || 1)}
                          className="w-16 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-core"
                          style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} />
                        {f.pageRangeError && <span className="text-xs text-red-400">{f.pageRangeError}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <button onClick={handleParse} disabled={!canParse} className="bg-violet-core hover:bg-violet-mid disabled:opacity-40 text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors">
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
          <input type="text" value={examTitle} onChange={e => setExamTitle(e.target.value)} className="w-full max-w-md px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-core" style={{ backgroundColor: V.inputBg, border: `1px solid ${V.inputBorder}`, color: V.text }} placeholder="Enter exam title" />
        </div>

        <div className="flex gap-2 mb-4">
          {(['all', 'flagged'] as const).map(key => (
            <button key={key} onClick={() => setFilter(key)} className="px-4 py-2 rounded-md text-sm font-medium transition-colors" style={pillBtn(filter === key)}>
              {key === 'all' ? 'Show All' : `Show Flagged Only (${flaggedCount})`}
            </button>
          ))}
        </div>

        {parsedSections.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button onClick={() => setActiveSection(null)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={pillBtn(activeSection === null)}>All Sections</button>
            {parsedSections.map((section, sIdx) => {
              const sf = section.questions.filter(q => q.confidence < 0.75).length;
              return (
                <button key={sIdx} onClick={() => setActiveSection(sIdx)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors" style={pillBtn(activeSection === sIdx)}>
                  {section.sectionName} ({section.questions.length}){sf > 0 && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">{sf}</span>}
                </button>
              );
            })}
          </div>
        )}

        {parsedSections.map((section, sIdx) => ({ section, sIdx })).filter(({ sIdx }) => activeSection === null || activeSection === sIdx).map(({ section, sIdx }) => {
          const lowConfCount = section.questions.filter(q => q.confidence < 1.0).length;
          return (
            <div key={sIdx} className="mb-8">
              <h2 className="text-xl font-semibold mb-3" style={{ color: V.text }}>Section: {section.sectionName}</h2>

              {/* AI Parser Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: V.surfaceAlt, border: `1px solid ${V.border}` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: V.text }}>AI Parser</p>
                  <p className="text-xs mt-0.5" style={{ color: V.textMut }}>
                    {lowConfCount > 0
                      ? `${lowConfCount} question${lowConfCount > 1 ? 's' : ''} below 100% confidence`
                      : 'All questions parsed at 100% confidence'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAiParse(sIdx, 'compact')}
                    disabled={isAiParsing || lowConfCount === 0}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ border: `1px solid ${V.border}`, color: V.textSec, backgroundColor: V.surface }}>
                    Parse Compactly
                  </button>
                  <button onClick={() => handleAiParse(sIdx, 'full')}
                    disabled={isAiParsing}
                    className="px-3 py-1.5 text-xs font-medium bg-violet-core text-white rounded-lg hover:bg-violet-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Parse Whole PDF
                  </button>
                </div>
              </div>

              {section.parseWarnings.length > 0 && (
                <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  {section.parseWarnings.map((w, i) => <p key={i} className="text-sm" style={{ color: '#fbbf24' }}>{w}</p>)}
                </div>
              )}

              {/* AI Parsing loading state */}
              {isAiParsing && aiParsingSection === sIdx ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-8 h-8 border-2 border-violet-core border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="font-medium" style={{ color: V.text }}>AI is parsing your PDF...</p>
                    <p className="text-sm mt-1" style={{ color: V.textSec }}>This can take up to 30 seconds. Do not close this tab.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {section.questions.map((q, qIdx) => ({ q, qIdx })).filter(({ q }) => filter === 'all' || q.confidence < 0.75).map(({ q, qIdx }) => (
                    <QuestionPreview key={q.id} question={q} onUpdate={(updated: ParsedQuestion) => updateParsedQuestion(sIdx, qIdx, updated)} onDelete={() => deleteParsedQuestion(sIdx, qIdx)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="sticky bottom-0 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 -mx-4 px-8" style={{ backgroundColor: V.surface, borderTop: `1px solid ${V.border}` }}>
          <span style={{ color: V.textSec }}>{totalQuestions} questions ready{flaggedCount > 0 && ` (${flaggedCount} need review)`}</span>
          <button onClick={handleConfirm} disabled={confirming || flaggedCount > 0} className="bg-violet-core hover:bg-violet-mid disabled:opacity-40 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors">
            {confirming ? 'Creating Exam...' : 'Proceed to Configure Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
