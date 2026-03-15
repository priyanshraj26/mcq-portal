import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

// GET /api/exams
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exams = await prisma.exam.findMany({
      where: { userId },
      include: {
        sections: { include: { questions: { select: { id: true } } } },
        settings: true,
        sessions: { orderBy: { startedAt: 'desc' }, take: 1, select: { id: true, status: true, submittedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(exams.map((exam) => ({
      id: exam.id, title: exam.title, createdAt: exam.createdAt,
      totalQuestions: exam.sections.reduce((sum, s) => sum + s.questions.length, 0),
      sectionCount: exam.sections.length, hasSettings: !!exam.settings,
      lastSession: exam.sessions[0] || null,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exams/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id as string, userId },
      include: {
        sections: { orderBy: { order: 'asc' }, include: { questions: { orderBy: { order: 'asc' } } } },
        settings: true,
      },
    });
    if (!exam) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(exam);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/exams/:id/settings
router.post('/:id/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const examId = req.params.id as string;
    const exam = await prisma.exam.findFirst({ where: { id: examId, userId } });
    if (!exam) { res.status(404).json({ error: 'Not found' }); return; }

    const { totalTimeLimitSecs, perQuestionTimeSecs, allowNavigation, shuffleQuestions, shuffleOptions, negativeMarking, negativeMarkValue, marksPerCorrect, passingPercentage, showResultImmediately } = req.body;

    if (req.body.sectionTimeLimits) {
      for (const st of req.body.sectionTimeLimits) {
        await prisma.section.update({ where: { id: st.sectionId }, data: { timeLimitSecs: st.timeLimitSecs || null } });
      }
    }
    if (req.body.title) {
      await prisma.exam.update({ where: { id: examId }, data: { title: req.body.title } });
    }

    const data = {
      totalTimeLimitSecs: totalTimeLimitSecs ?? null, perQuestionTimeSecs: perQuestionTimeSecs ?? null,
      allowNavigation: allowNavigation ?? true, shuffleQuestions: shuffleQuestions ?? false,
      shuffleOptions: shuffleOptions ?? false, negativeMarking: negativeMarking ?? false,
      negativeMarkValue: negativeMarkValue ?? 0.25, marksPerCorrect: marksPerCorrect ?? 1.0,
      passingPercentage: passingPercentage ?? null, showResultImmediately: showResultImmediately ?? true,
    };

    const settings = await prisma.examSettings.upsert({
      where: { examId },
      update: data,
      create: { examId, ...data },
    });
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exam = await prisma.exam.findFirst({ where: { id: req.params.id as string, userId } });
    if (!exam) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.exam.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
