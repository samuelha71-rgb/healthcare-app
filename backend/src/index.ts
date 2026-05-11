// 서버 진입점
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

import { errorHandler } from './middleware/error';
import { authenticate } from './middleware/auth';
import { authRouter } from './routes/auth';
import { membersRouter } from './routes/members';
import { routinesRouter } from './routes/routines';
import { workoutLogsRouter } from './routes/workout-logs';
import { inbodyRouter } from './routes/inbody';
import { photosRouter } from './routes/photos';
import { goalsRouter } from './routes/goals';
import { exportRouter } from './routes/export';
import { statsRouter } from './routes/stats';
import { exercisesRouter } from './routes/exercises';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === 'production';

// Render 등 리버스 프록시 뒤에서 클라이언트 IP·레이트 리밋이 올바르게 동작하도록
if (isProd) {
  app.set('trust proxy', 1);
}

const corsOrigin = process.env.CORS_ORIGIN?.trim();
if (corsOrigin) {
  app.use(
    cors({
      origin: corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
} else {
  app.use(cors());
}

/** 로그인·학생 목록 API 무차별 시도 완화 (동작·응답 형식은 동일, 초과 시 429) */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? '300'),
  standardHeaders: true,
  legacyHeaders: false,
});
// 사진을 base64로 받기 위해 큰 본문 허용
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', authenticate);

app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/members', membersRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/workout-logs', workoutLogsRouter);
app.use('/api/inbody', inbodyRouter);
app.use('/api/photos', photosRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/export', exportRouter);
app.use('/api/stats', statsRouter);
app.use('/api/exercises', exercisesRouter);

app.use(errorHandler);

// 프로덕션: 빌드된 프론트엔드를 함께 서빙
if (isProd) {
  const staticDir = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
