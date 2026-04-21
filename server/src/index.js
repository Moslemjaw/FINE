import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDb } from './lib/db.js';
import { authRouter } from './routes/auth.js';
import { newsRouter } from './routes/news.js';
import { articlesRouter } from './routes/articles.js';
import { analysisRouter } from './routes/analysis.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/news', newsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/analysis', analysisRouter);

const port = Number(process.env.PORT ?? 8080);

await connectDb();
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});

