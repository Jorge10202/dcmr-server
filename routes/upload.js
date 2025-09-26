import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const must = (k) => {
  if (!process.env[k]) throw new Error(`Falta variable de entorno ${k}`);
};
try {
  must('CLOUDINARY_CLOUD_NAME');
  must('CLOUDINARY_API_KEY');
  must('CLOUDINARY_API_SECRET');
} catch (e) {
  console.error('[UPLOAD] Configuración inválida:', e.message);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const r = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const multerGuard = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Archivo demasiado grande (máx 10MB)' });
    }
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  });
};

r.post('/', multerGuard, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'dcmr', resource_type: 'image' },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    const msg =
      e?.error?.message ||
      e?.message ||
      'Cloudinary error';
    console.error('[UPLOAD] Cloudinary:', msg, e?.http_code ? `(http ${e.http_code})` : '');
    res.status(500).json({ error: `Cloudinary: ${msg}` });
  }
});

export default r;
