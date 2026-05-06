import { Router } from 'express';
import type { RequestHandler } from 'express';
import path from 'path';
import { upload } from '../middleware/upload';
import { env } from '../config/env';

const router = Router();

const uploadFile: RequestHandler = (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  // Use PUBLIC_URL in production, fallback to local for dev
  const baseUrl = env.PUBLIC_URL || `http://localhost:${env.PORT}`;
  const url = `${baseUrl}/uploads/${path.basename(req.file.path)}`;
  res.json({ data: { url } });
};

router.post('/', upload.single('file'), uploadFile);

export { router as uploadRouter };
