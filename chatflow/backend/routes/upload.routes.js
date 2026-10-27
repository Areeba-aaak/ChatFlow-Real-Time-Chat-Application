const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const uploadController = require('../controllers/upload.controller');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');

// All upload routes require authentication
router.use(auth);

// Upload single file
router.post(
  '/single',
  uploadLimiter,
  uploadSingle,
  handleUploadError,
  uploadController.uploadFile
);

// Upload multiple files
router.post(
  '/multiple',
  uploadLimiter,
  uploadMultiple,
  handleUploadError,
  uploadController.uploadMultiple
);

// Delete file
router.delete('/:filename', uploadController.deleteFile);

// Get file info
router.get('/:filename/info', uploadController.getFileInfo);

module.exports = router;