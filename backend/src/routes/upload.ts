import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parsePdf } from '../services/pdfParser';
import { extractQuestions, ParsedSection } from '../services/questionExtractor';
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

// In-memory store for upload sessions (before confirmation)
const uploadSessions = new Map<string, { sections: ParsedSection[] }>();

// POST /api/upload/pdf
router.post('/pdf', requireAuth, upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No PDF files uploaded' });
      return;
    }

    const sections: ParsedSection[] = [];

    for (const file of files) {
      // Write buffer to temp file for parsePdf (which reads from path)
      const tmpPath = path.join(os.tmpdir(), `mcq-${uuidv4()}.pdf`);
      fs.writeFileSync(tmpPath, file.buffer);
      try {
        const pdfResult = await parsePdf(tmpPath, file.originalname);
        sections.push(extractQuestions(pdfResult));
      } finally {
        fs.unlinkSync(tmpPath);
      }
    }

    const uploadId = uuidv4();
    uploadSessions.set(uploadId, { sections });
    setTimeout(() => uploadSessions.delete(uploadId), 60 * 60 * 1000);

    res.json({ uploadId, sections });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
});

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
