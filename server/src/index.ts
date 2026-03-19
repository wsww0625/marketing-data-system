import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import multer from 'multer';
import { appRouter } from './routers/index.js';
import { createContext } from './trpc.js';
import { verifyToken } from './auth.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File upload
const upload = multer({
  dest: path.join(uploadsDir, 'temp'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: '未授权' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }
  res.json({
    filePath: req.file.path,
    fileName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    size: req.file.size,
  });
});

// Multi-file upload
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: '未授权' });
    return;
  }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res.status(400).json({ error: '未上传文件' });
    return;
  }
  res.json(
    files.map(f => ({
      filePath: f.path,
      fileName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
      size: f.size,
    }))
  );
});

// File download endpoint
app.get('/api/download/:fileName', (req, res) => {
  const token = req.query.token as string || req.headers.authorization?.slice(7);
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: '未授权' });
    return;
  }
  const filePath = path.join(uploadsDir, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '文件不存在' });
    return;
  }
  res.download(filePath);
});

// tRPC
app.use('/trpc', createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => createContext(req),
}));

// Serve static frontend in production
const clientDist = path.resolve('../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
