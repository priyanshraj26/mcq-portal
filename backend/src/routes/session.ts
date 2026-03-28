import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

function shuffleArray<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

// POST /api/sessions/start
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { examId } = req.body;

    const exam = await prisma.exam.findFirst({
      where: { id: examId, userId },
      include: {
        sections: { orderBy: { order: 'asc' }, include: { questions: { orderBy: { order: 'asc' } } } },
        settings: true,
      },
    });
    if (!exam) { res.status(404).json({ error: 'Not found' }); return; }

    const session = await prisma.examSession.create({ data: { examId, userId } });

    let sections = exam.sections.map((s) => ({
      ...s,
      questions: exam.settings?.shuffleQuestions ? shuffleArray(s.questions) : s.questions,
    }));

    const didShuffleOptions = !!exam.settings?.shuffleOptions;

    if (didShuffleOptions) {
      sections = sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => {
          const indices = (q.options as string[]).map((_: string, i: number) => i);
          const shuffled = shuffleArray(indices);
          const shuffledOptions = shuffled.map((i: number) => (q.options as string[])[i]);
          const shuffledCorrectIndex = shuffled.indexOf(q.correctAnswerIndex);
          return { ...q, options: shuffledOptions, correctAnswerIndex: shuffledCorrectIndex, _shuffledOptions: shuffledOptions, _shuffledCorrectIndex: shuffledCorrectIndex };
        }),
      }));
    }

    await prisma.answer.createMany({
      data: sections.flatMap((s) => s.questions).map((q: any) => ({
        sessionId: session.id,
        questionId: q.id,
        shuffledOptions: didShuffleOptions ? q._shuffledOptions : null,
        shuffledCorrectIndex: didShuffleOptions ? q._shuffledCorrectIndex : null,
      })),
    });

    res.json({ sessionId: session.id, exam: { ...exam, sections }, startedAt: session.startedAt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const session = await prisma.examSession.findFirst({
      where: { id: req.params.id as string, userId },
      include: {
        exam: { include: { sections: { orderBy: { order: 'asc' }, include: { questions: { orderBy: { order: 'asc' } } } }, settings: true } },
        answers: true,
      },
    });
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/sessions/:id/answer
router.patch('/:id/answer', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const session = await prisma.examSession.findFirst({ where: { id: req.params.id as string, userId } });
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }

    const { questionId, selectedIndex, markedForReview, isCompleted, timeTakenSecs } = req.body;
    const existing = await prisma.answer.findFirst({ where: { sessionId: req.params.id as string, questionId } });
    if (!existing) { res.status(404).json({ error: 'Answer record not found' }); return; }

    const answer = await prisma.answer.update({
      where: { id: existing.id },
      data: {
        selectedIndex: selectedIndex !== undefined ? selectedIndex : existing.selectedIndex,
        markedForReview: markedForReview !== undefined ? markedForReview : existing.markedForReview,
        isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
        timeTakenSecs: timeTakenSecs !== undefined ? (existing.timeTakenSecs || 0) + timeTakenSecs : existing.timeTakenSecs,
        visitCount: existing.visitCount + 1,
      },
    });
    res.json(answer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/submit
router.post('/:id/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const session = await prisma.examSession.findFirst({ where: { id: req.params.id as string, userId } });
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }
    if (session.status === 'SUBMITTED') { res.status(400).json({ error: 'Already submitted' }); return; }

    const now = new Date();
    const updated = await prisma.examSession.update({
      where: { id: req.params.id as string },
      data: { status: 'SUBMITTED', submittedAt: now, timeTakenSecs: Math.floor((now.getTime() - session.startedAt.getTime()) / 1000) },
    });
    res.json({ sessionId: updated.id, status: updated.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
