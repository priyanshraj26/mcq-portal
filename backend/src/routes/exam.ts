import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const paramId = (req: Request): string => req.params.id as string;

// GET /api/exams
router.get('/', async (_req: Request, res: Response) => {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        sections: {
          include: { questions: { select: { id: true } } },
        },
        settings: true,
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { id: true, status: true, submittedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      createdAt: exam.createdAt,
      totalQuestions: exam.sections.reduce((sum, s) => sum + s.questions.length, 0),
      sectionCount: exam.sections.length,
      hasSettings: !!exam.settings,
      lastSession: exam.sessions[0] || null,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exams/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: paramId(req) },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            questions: { orderBy: { order: 'asc' } },
          },
        },
        settings: true,
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    res.json(exam);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/exams/:id/settings
router.post('/:id/settings', async (req: Request, res: Response) => {
  try {
    const examId = paramId(req);
    const {
      totalTimeLimitSecs,
      perQuestionTimeSecs,
      allowNavigation,
      shuffleQuestions,
      shuffleOptions,
      negativeMarking,
      negativeMarkValue,
      marksPerCorrect,
      passingPercentage,
      showResultImmediately,
    } = req.body;

    // Also update section time limits if provided
    if (req.body.sectionTimeLimits) {
      for (const st of req.body.sectionTimeLimits) {
        await prisma.section.update({
          where: { id: st.sectionId },
          data: { timeLimitSecs: st.timeLimitSecs || null },
        });
      }
    }

    // Update exam title if provided
    if (req.body.title) {
      await prisma.exam.update({
        where: { id: examId },
        data: { title: req.body.title },
      });
    }

    const settings = await prisma.examSettings.upsert({
      where: { examId },
      update: {
        totalTimeLimitSecs: totalTimeLimitSecs ?? null,
        perQuestionTimeSecs: perQuestionTimeSecs ?? null,
        allowNavigation: allowNavigation ?? true,
        shuffleQuestions: shuffleQuestions ?? false,
        shuffleOptions: shuffleOptions ?? false,
        negativeMarking: negativeMarking ?? false,
        negativeMarkValue: negativeMarkValue ?? 0.25,
        marksPerCorrect: marksPerCorrect ?? 1.0,
        passingPercentage: passingPercentage ?? null,
        showResultImmediately: showResultImmediately ?? true,
      },
      create: {
        examId,
        totalTimeLimitSecs: totalTimeLimitSecs ?? null,
        perQuestionTimeSecs: perQuestionTimeSecs ?? null,
        allowNavigation: allowNavigation ?? true,
        shuffleQuestions: shuffleQuestions ?? false,
        shuffleOptions: shuffleOptions ?? false,
        negativeMarking: negativeMarking ?? false,
        negativeMarkValue: negativeMarkValue ?? 0.25,
        marksPerCorrect: marksPerCorrect ?? 1.0,
        passingPercentage: passingPercentage ?? null,
        showResultImmediately: showResultImmediately ?? true,
      },
    });

    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.exam.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
