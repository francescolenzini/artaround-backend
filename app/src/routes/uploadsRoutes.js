const express = require('express');
const multer = require('multer');

const Upload = require('../models/Upload');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { generateEntityId } = require('../services/ids');

const router = express.Router();

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('Only image files are allowed (png, jpeg, webp, gif)');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
}).single('file');

// Normalizza gli errori di multer sul formato standard dell'errorHandler.
function handleUpload(req, res, next) {
  uploadSingleImage(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        error.status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        if (error.code === 'LIMIT_FILE_SIZE') {
          error.message = `File too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`;
        }
      }
      return next(error);
    }
    return next();
  });
}

// GET pubblica (niente api key/JWT): i tag <img> di Navigator e Marketplace
// non possono inviare header custom, e le immagini dei contenuti non sono
// dati sensibili.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const upload = await Upload.findOne({ id: req.params.id });

    if (!upload) {
      return res.status(404).json({ error: { message: 'Upload not found', status: 404 } });
    }

    res.setHeader('Content-Type', upload.mimeType);
    // Gli upload sono immutabili (mai riscritti sullo stesso id): cache lunga.
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(upload.data);
  })
);

router.post(
  '/',
  requireApiKeyAndJwt,
  requireContentEditor,
  handleUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'Missing file field "file"', status: 400 } });
    }

    const upload = await Upload.create({
      id: generateEntityId('upl'),
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
      uploaderId: req.user.id,
    });

    // Mai restituire il buffer nel JSON: il client usa `url` come riferimento
    // da salvare in Artwork.assets[].source / ArtworkItem.images[].source.
    return res.status(201).json({
      id: upload.id,
      filename: upload.filename,
      mimeType: upload.mimeType,
      size: upload.size,
      url: `/uploads/${upload.id}`,
      createdAt: upload.createdAt,
    });
  })
);

module.exports = router;
