import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerk } from './middleware/auth';
import uploadRoutes from './routes/upload';
import examRoutes from './routes/exam';
import sessionRoutes from './routes/session';
import analysisRoutes from './routes/analysis';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Health check - before auth so it requires no JWT (used by UptimeRobot)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(clerk);

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', analysisRoutes);

app.listen(PORT, () => {
  console.log(`MCQ Portal backend running on http://localhost:${PORT}`);
});

export default app;
