import { Router, Request, Response } from 'express';
import { generateAnalysis } from '../services/analysisEngine';

const router = Router();

// GET /api/sessions/:id/analysis
router.get('/sessions/:id/analysis', async (req: Request, res: Response) => {
  try {
    const analysis = await generateAnalysis(req.params.id as string);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
