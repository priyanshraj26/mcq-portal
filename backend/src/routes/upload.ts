import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { parsePdf } from '../services/pdfParser';
import { extractQuestions, ParsedSection } from '../services/questionExtractor';
import prisma from '../lib/prisma';

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// In-memory store for upload sessions (before confirmation)
const uploadSessions = new Map<string, { sections: ParsedSection[]; filePaths: string[] }>();

// POST /api/upload/pdf
router.post('/pdf', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No PDF files uploaded' });
      return;
    }

    const sections: ParsedSection[] = [];
    const filePaths: string[] = [];

    for (const file of files) {
      const pdfResult = await parsePdf(file.path, file.originalname);
      const section = extractQuestions(pdfResult);
      sections.push(section);
      filePaths.push(file.path);
    }

    const uploadId = uuidv4();
    uploadSessions.set(uploadId, { sections, filePaths });

    // Clean up sessions after 1 hour
    setTimeout(() => {
      uploadSessions.delete(uploadId);
    }, 60 * 60 * 1000);

    res.json({ uploadId, sections });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse PDF' });
  }
});

// POST /api/upload/confirm
router.post('/confirm', async (req: Request, res: Response) => {
  try {
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
      include: {
        sections: {
          include: { questions: true },
        },
      },
    });

    uploadSessions.delete(uploadId);

    res.json({ examId: exam.id, exam });
  } catch (error: any) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to create exam' });
  }
});

export default router;
