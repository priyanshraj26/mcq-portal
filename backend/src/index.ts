import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import uploadRoutes from './routes/upload';
import examRoutes from './routes/exam';
import sessionRoutes from './routes/session';
import analysisRoutes from './routes/analysis';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', analysisRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`MCQ Portal backend running on http://localhost:${PORT}`);
});

export default app;
