import { Router, Request, Response } from 'express';
import { generateAnalysis } from '../services/analysisEngine';
import prisma from '../lib/prisma';
import { requireAuth, getUserId } from '../middleware/auth';

const router = Router();

router.get('/sessions/:id/analysis', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const session = await prisma.examSession.findFirst({ where: { id: req.params.id as string, userId } });
    if (!session) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(await generateAnalysis(req.params.id as string));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
