import express from 'express';
import { requireAuth } from '../lib/auth.js';
import { User } from '../models/User.js';
import { News } from '../models/News.js';
import { SimulationRun } from '../models/SimulationRun.js';
import { DebateSession } from '../models/DebateSession.js';
import { getAiLatency, getLastNewsFetchAt } from '../lib/metrics.js';

export const adminRouter = express.Router();

function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

adminRouter.get('/dashboard', requireAuth, requireAdmin, async (_req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalNews,
    weeklyNews,
    analyzedNews,
    totalSimulations,
    totalDebates,
    recentUsers,
    recentSimulations,
  ] = await Promise.all([
    User.countDocuments(),
    News.countDocuments(),
    News.countDocuments({ publishedAt: { $gte: since } }),
    News.countDocuments({ analyzed: true }),
    SimulationRun.countDocuments(),
    DebateSession.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(10).select('name email role createdAt'),
    SimulationRun.find().sort({ createdAt: -1 }).limit(10).select('userId filters itemsAnalyzed createdAt'),
  ]);

  return res.json({
    stats: {
      totalUsers,
      totalNews,
      weeklyNews,
      analyzedNews,
      totalSimulations,
      totalDebates,
    },
    aiLatency: getAiLatency(),
    lastNewsFetch: getLastNewsFetchAt(),
    recentUsers,
    recentSimulations,
  });
});

adminRouter.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(100).select('name email role createdAt');
  return res.json({ items: users });
});

adminRouter.get('/activity', requireAuth, requireAdmin, async (_req, res) => {
  const [sims, debates] = await Promise.all([
    SimulationRun.find().sort({ createdAt: -1 }).limit(30)
      .select('userId filters itemsAnalyzed createdAt'),
    DebateSession.find().sort({ createdAt: -1 }).limit(30)
      .select('userId trigger status marketImpactRating createdAt'),
  ]);
  return res.json({ simulations: sims, debates });
});
