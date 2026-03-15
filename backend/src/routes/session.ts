import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

const paramId = (req: Request): string => req.params.id as string;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// POST /api/sessions/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { examId } = req.body;

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { questions: { orderBy: { order: 'asc' } } },
        },
        settings: true,
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Exam not found' });
      return;
    }

    // Create session
    const session = await prisma.examSession.create({
      data: { examId },
    });

    // Prepare questions (with optional shuffling)
    let sections = exam.sections.map((s) => ({
      ...s,
      questions: exam.settings?.shuffleQuestions ? shuffleArray(s.questions) : s.questions,
    }));

    // Shuffle options if configured
    if (exam.settings?.shuffleOptions) {
      sections = sections.map((s) => ({
        ...s,
        questions: s.questions.map((q) => {
          const indices = (q.options as string[]).map((_: string, i: number) => i);
          const shuffledIndices = shuffleArray(indices);
          const shuffledOptions = shuffledIndices.map((i: number) => (q.options as string[])[i]);
          const newCorrectIndex = shuffledIndices.indexOf(q.correctAnswerIndex);
          return { ...q, options: shuffledOptions, correctAnswerIndex: newCorrectIndex };
        }),
      }));
    }

    // Create answer placeholders for all questions
    const allQuestions = sections.flatMap((s) => s.questions);
    await prisma.answer.createMany({
      data: allQuestions.map((q) => ({
        sessionId: session.id,
        questionId: q.id,
      })),
    });

    res.json({
      sessionId: session.id,
      exam: {
        ...exam,
        sections,
      },
      startedAt: session.startedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await prisma.examSession.findUnique({
      where: { id: paramId(req) },
      include: {
        exam: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { questions: { orderBy: { order: 'asc' } } },
            },
            settings: true,
          },
        },
        answers: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/sessions/:id/answer
router.patch('/:id/answer', async (req: Request, res: Response) => {
  try {
    const { questionId, selectedIndex, markedForReview, isCompleted, timeTakenSecs } = req.body;

    const existing = await prisma.answer.findFirst({
      where: { sessionId: paramId(req), questionId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Answer record not found' });
      return;
    }

    const answer = await prisma.answer.update({
      where: { id: existing.id },
      data: {
        selectedIndex: selectedIndex !== undefined ? selectedIndex : existing.selectedIndex,
        markedForReview: markedForReview !== undefined ? markedForReview : existing.markedForReview,
        isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
        timeTakenSecs: timeTakenSecs !== undefined
          ? (existing.timeTakenSecs || 0) + timeTakenSecs
          : existing.timeTakenSecs,
        visitCount: existing.visitCount + 1,
      },
    });

    res.json(answer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:id/submit
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const session = await prisma.examSession.findUnique({
      where: { id: paramId(req) },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status === 'SUBMITTED') {
      res.status(400).json({ error: 'Session already submitted' });
      return;
    }

    const now = new Date();
    const timeTakenSecs = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

    const updated = await prisma.examSession.update({
      where: { id: paramId(req) },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
        timeTakenSecs,
      },
    });

    res.json({ sessionId: updated.id, status: updated.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
