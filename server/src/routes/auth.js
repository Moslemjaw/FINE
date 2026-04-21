import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { clearAuthCookie, setAuthCookie, signToken, requireAuth } from '../lib/auth.js';

export const authRouter = express.Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(60),
  password: z.string().min(8).max(200),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { email, name, password } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'email_in_use' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, name, passwordHash, role: 'user' });

  const token = signToken({ sub: user._id.toString(), role: user.role, email: user.email });
  setAuthCookie(res, token);
  return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ sub: user._id.toString(), role: user.role, email: user.email });
  setAuthCookie(res, token);
  return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

authRouter.post('/logout', async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.auth.sub).select('email name role');
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  return res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
});

