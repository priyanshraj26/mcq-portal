import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parsePdfWithPipeline, getPdfPageCount } from '../services/pdfParser';
import { ParsedSection, ParsedQuestion } from '../services/questionExtractor';
import { parseCompact, parseWholePdf } from '../services/geminiParser';
import prisma from '../lib/prisma';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// Extended section type with metadata for AI parsing
interface StoredSection extends ParsedSection {
  pageCount?: number;
  appliedPageRange?: { from: number; to: number } | null;
}

// In-memory store — now also stores PDF buffers for AI parsing
const uploadSessions = new Map<string, {
  sections: StoredSection[];
  buffers: Buffer[];
}>();

// POST /api/upload/pdf
router.post('/pdf', requireAuth, upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No PDF files uploaded' });
      return;
    }

    // Parse pageRanges from request body if provided
    const pageRanges: Record<number, { from: number; to: number }> =
      JSON.parse(req.body.pageRanges || '{}');

    const sections: StoredSection[] = [];
    const buffers: Buffer[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const pageRange = pageRanges[i];

      // Validate page count
      const pageCount = await getPdfPageCount(file.buffer);

      if (!pageRange && pageCount > 40) {
        res.status(400).json({
          error: `PDF "${file.originalname}" has ${pageCount} pages. Maximum is 40 pages. Please select a page range.`,
          fileIndex: i,
          pageCount,
          requiresPageRange: true,
        });
        return;
      }

      if (pageRange) {
        const rangeSize = pageRange.to - pageRange.from + 1;
        if (rangeSize > 40) {
          res.status(400).json({
            error: `Selected page range is ${rangeSize} pages. Maximum is 40 pages.`,
            fileIndex: i,
          });
          return;
        }
        if (pageRange.from < 1 || pageRange.to > pageCount) {
          res.status(400).json({
            error: `Page range ${pageRange.from}-${pageRange.to} is out of bounds for a ${pageCount}-page PDF.`,
            fileIndex: i,
          });
          return;
        }
      }

      // Parse with 3-layer pipeline (Layer 1 + auto Layer 2)
      const parsed = await parsePdfWithPipeline(file.buffer, file.originalname, pageRange);
      sections.push({
        ...parsed,
        pageCount,
        appliedPageRange: pageRange || null,
      });
      buffers.push(file.buffer);
    }

    const uploadId = uuidv4();
    uploadSessions.set(uploadId, { sections, buffers });
    setTimeout(() => uploadSessions.delete(uploadId), 60 * 60 * 1000);

    res.json({ uploadId, sections });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
});

// POST /api/upload/:uploadId/ai-parse — Layer 3: AI parsing for a specific section
router.post('/:uploadId/ai-parse', requireAuth, async (req: Request, res: Response) => {
  const uploadId = req.params.uploadId as string;
  const { sectionIndex, mode } = req.body as {
    sectionIndex: number;
    mode: 'compact' | 'full';
  };

  const stored = uploadSessions.get(uploadId);
  if (!stored) {
    res.status(404).json({ error: 'Upload session expired. Please re-upload the PDF.' });
    return;
  }

  const section = stored.sections[sectionIndex];
  const pdfBuffer = stored.buffers[sectionIndex];

  if (!section || !pdfBuffer) {
    res.status(400).json({ error: 'Invalid section index' });
    return;
  }

  try {
    let aiQuestions: ParsedQuestion[];

    if (mode === 'compact') {
      const lowConfidence = section.questions
        .filter(q => q.confidence < 1.0)
        .map(q => ({ rawText: q.rawText, questionNumber: q.questionNumber }));

      if (lowConfidence.length === 0) {
        res.json({
          message: 'All questions already at 100% confidence. No AI parsing needed.',
          questions: section.questions,
        });
        return;
      }

      aiQuestions = await parseCompact(lowConfidence);
    } else {
      aiQuestions = await parseWholePdf(pdfBuffer, section.appliedPageRange ?? undefined);
    }

    // Merge AI results
    const mergedQuestions = mergeAiResults(section.questions, aiQuestions, mode);

    // Update stored section
    stored.sections[sectionIndex] = {
      ...section,
      questions: mergedQuestions,
    };

    res.json({ questions: mergedQuestions });
  } catch (err: any) {
    console.error('AI parse error:', err);

    if (err?.status === 429) {
      res.status(429).json({
        error: 'Gemini API rate limit reached. Please wait a moment and try again.',
      });
      return;
    }

    res.status(500).json({ error: 'AI parsing failed. Please try again.' });
  }
});

function mergeAiResults(
  originalQuestions: ParsedQuestion[],
  aiQuestions: ParsedQuestion[],
  mode: 'compact' | 'full'
): ParsedQuestion[] {
  const parsedBy = mode === 'compact' ? 'ai-compact' as const : 'ai-full' as const;

  if (mode === 'full') {
    // Full mode: AI replaces all questions
    return aiQuestions.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
      parsedBy,
    }));
  }

  // Compact mode: AI replaces only low-confidence questions
  const aiByNumber = new Map(aiQuestions.map(q => [q.questionNumber, q]));

  return originalQuestions.map(q => {
    if (q.confidence < 1.0) {
      const aiVersion = aiByNumber.get(q.questionNumber);
      if (aiVersion) {
        return { ...aiVersion, questionNumber: q.questionNumber, parsedBy };
      }
    }
    return q;
  });
}

// POST /api/upload/confirm
router.post('/confirm', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { uploadId, title, sections } = req.body;

    if (!uploadId || !sections || !Array.isArray(sections)) {
      res.status(400).json({ error: 'Missing uploadId or sections' });
      return;
    }

    const session = uploadSessions.get(uploadId);
    if (!session) {
      res.status(404).json({ error: 'Upload session not found or expired' });
      return;
    }

    const exam = await prisma.exam.create({
      data: {
        userId,
        title: title || 'Untitled Exam',
        sections: {
          create: sections.map((section: any, sIdx: number) => ({
            name: section.sectionName || `Section ${sIdx + 1}`,
            order: sIdx,
            questions: {
              create: (section.questions || []).map((q: any, qIdx: number) => ({
                order: qIdx,
                questionText: q.questionText,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex,
                rawPdfText: q.rawText || null,
                confidence: q.confidence || 1.0,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { questions: true } } },
    });

    uploadSessions.delete(uploadId);
    res.json({ examId: exam.id, exam });
  } catch (error: any) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to create exam' });
  }
});

export default router;
