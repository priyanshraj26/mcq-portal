import { useState } from 'react';
import type { ParsedQuestion } from '../../store/examStore';

interface Props {
  question: ParsedQuestion;
  onUpdate: (q: ParsedQuestion) => void;
  onDelete: () => void;
}

export default function QuestionPreview({ question, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editQ, setEditQ] = useState(question);

  const confidenceColor =
    question.confidence >= 0.9
      ? 'bg-green-100 text-green-700'
      : question.confidence >= 0.75
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  const handleSave = () => {
    onUpdate({ ...editQ, confidence: 1.0, flags: [] });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditQ(question);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-white border-2 border-blue-300 rounded-lg p-5 shadow-sm">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
          <textarea
            value={editQ.questionText}
            onChange={(e) => setEditQ({ ...editQ, questionText: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
          />
        </div>

        {editQ.options.map((opt, idx) => (
          <div key={idx} className="mb-2 flex items-center gap-2">
            <input
              type="radio"
              checked={editQ.correctAnswerIndex === idx}
              onChange={() => setEditQ({ ...editQ, correctAnswerIndex: idx })}
              className="mt-0.5"
            />
            <span className="text-sm font-medium w-6">{String.fromCharCode(65 + idx)}.</span>
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const options = [...editQ.options];
                options[idx] = e.target.value;
                setEditQ({ ...editQ, options });
              }}
              className="flex-1 px-3 py-1.5 border rounded-md text-sm"
            />
          </div>
        ))}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-500 shrink-0">Q{question.questionNumber}</span>
          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${confidenceColor}`}>
            {Math.round(question.confidence * 100)}%
          </span>
          {question.flags.map((flag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
          <span className="text-sm text-gray-600 truncate ml-1">
            {question.questionText.length > 80
              ? question.questionText.slice(0, 80) + '...'
              : question.questionText}
          </span>
        </div>
        <span className="text-gray-400 shrink-0 ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-3">
          <div className="flex justify-end gap-1 mb-3">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="text-blue-600 hover:text-blue-800 text-sm px-2"
            >
              Edit
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-red-500 hover:text-red-700 text-sm px-2"
            >
              Delete
            </button>
          </div>

          <p className="text-gray-900 mb-3 whitespace-pre-wrap">{question.questionText}</p>

          <div className="space-y-1.5">
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 px-3 py-1.5 rounded ${
                  idx === question.correctAnswerIndex
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50'
                }`}
              >
                <span className="font-medium text-sm text-gray-600 min-w-[20px]">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className={`text-sm ${idx === question.correctAnswerIndex ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                  {opt}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
