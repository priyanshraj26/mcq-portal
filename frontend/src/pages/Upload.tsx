import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadPdfs, confirmUpload } from '../api/client';
import useExamStore, { type ParsedQuestion, type ParsedSection } from '../store/examStore';
import QuestionPreview from '../components/upload/QuestionPreview';
import toast from 'react-hot-toast';

export default function Upload() {
  const navigate = useNavigate();
  const { uploadId, parsedSections, setUploadResult, updateParsedQuestion, deleteParsedQuestion } =
    useExamStore();

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'flagged'>('all');
  const [confirming, setConfirming] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfs = acceptedFiles.filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...pdfs]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const handleParse = async () => {
    if (files.length === 0) {
      toast.error('Please add at least one PDF file');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadPdfs(files);
      setUploadResult(result.uploadId, result.sections);
      setExamTitle(files[0].name.replace(/\.pdf$/i, ''));
      setParsed(true);
      toast.success(`Parsed ${result.sections.reduce((s: number, sec: ParsedSection) => s + sec.questions.length, 0)} questions`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to parse PDFs');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!uploadId) return;

    // Check for unresolved flagged questions
    const hasRedFlags = parsedSections.some((s) =>
      s.questions.some((q) => q.confidence < 0.75)
    );
    if (hasRedFlags) {
      toast.error('Please resolve all flagged questions (red) before proceeding');
      return;
    }

    setConfirming(true);
    try {
      const result = await confirmUpload({
        uploadId,
        title: examTitle || 'Untitled Exam',
        sections: parsedSections,
      });
      toast.success('Exam created successfully!');
      navigate(`/configure/${result.examId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setConfirming(false);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalQuestions = parsedSections.reduce((s, sec) => s + sec.questions.length, 0);
  const flaggedCount = parsedSections.reduce(
    (s, sec) => s + sec.questions.filter((q) => q.confidence < 0.75).length,
    0
  );

  if (!parsed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
          >
            &larr; Back to Home
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-6">Upload PDFs</h1>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-5xl mb-4">📄</div>
            <p className="text-lg text-gray-600">
              {isDragActive ? 'Drop PDF files here...' : 'Drag & drop PDF files here, or click to browse'}
            </p>
            <p className="text-sm text-gray-400 mt-2">Each PDF will become a separate section</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-gray-700">Files ({files.length})</h3>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border"
                >
                  <div>
                    <span className="text-gray-800">{file.name}</span>
                    <span className="text-gray-400 text-sm ml-2">
                      ({(file.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Parse Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleParse}
              disabled={files.length === 0 || uploading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg text-lg shadow-md transition-colors"
            >
              {uploading ? 'Parsing PDFs...' : 'Parse PDFs'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview parsed questions
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          onClick={() => setParsed(false)}
          className="text-blue-600 hover:text-blue-800 mb-6 inline-block"
        >
          &larr; Back to Upload
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Parsed Questions</h1>
        <div className="flex items-center gap-4 mb-6">
          <span className="text-gray-600">
            {totalQuestions} questions in {parsedSections.length} section(s)
          </span>
          {flaggedCount > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm">
              {flaggedCount} flagged
            </span>
          )}
        </div>

        {/* Exam Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
          <input
            type="text"
            value={examTitle}
            onChange={(e) => setExamTitle(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter exam title"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Show All
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'flagged' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            Show Flagged Only ({flaggedCount})
          </button>
        </div>

        {/* Section tabs */}
        {parsedSections.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setActiveSection(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSection === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Sections
            </button>
            {parsedSections.map((section, sIdx) => {
              const sectionFlagged = section.questions.filter((q) => q.confidence < 0.75).length;
              return (
                <button
                  key={sIdx}
                  onClick={() => setActiveSection(sIdx)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeSection === sIdx
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.sectionName} ({section.questions.length})
                  {sectionFlagged > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {sectionFlagged}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Questions */}
        {parsedSections
          .map((section, sIdx) => ({ section, sIdx }))
          .filter(({ sIdx }) => activeSection === null || activeSection === sIdx)
          .map(({ section, sIdx }) => (
          <div key={sIdx} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Section: {section.sectionName}
            </h2>
            {section.parseWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                {section.parseWarnings.map((w, i) => (
                  <p key={i} className="text-yellow-700 text-sm">{w}</p>
                ))}
              </div>
            )}
            <div className="space-y-4">
              {section.questions
                .map((q, qIdx) => ({ q, qIdx }))
                .filter(({ q }) => filter === 'all' || q.confidence < 0.75)
                .map(({ q, qIdx }) => (
                  <QuestionPreview
                    key={q.id}
                    question={q}
                    onUpdate={(updated: ParsedQuestion) => updateParsedQuestion(sIdx, qIdx, updated)}
                    onDelete={() => deleteParsedQuestion(sIdx, qIdx)}
                  />
                ))}
            </div>
          </div>
        ))}

        {/* Confirm */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between -mx-4 px-8">
          <span className="text-gray-600">
            {totalQuestions} questions ready
            {flaggedCount > 0 && ` (${flaggedCount} need review)`}
          </span>
          <button
            onClick={handleConfirm}
            disabled={confirming || flaggedCount > 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors"
          >
            {confirming ? 'Creating Exam...' : 'Proceed to Configure Exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
