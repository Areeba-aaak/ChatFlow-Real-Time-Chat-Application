const path = require('path');
const fs = require('fs').promises;
const { successResponse } = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class UploadController {
  async uploadFile(req, res, next) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const { file } = req;
      const fileUrl = `/uploads/${file.filename}`;

      return successResponse(res, {
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        fieldname: file.fieldname,
      }, 'File uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadMultiple(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      const files = req.files.map(file => ({
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        fieldname: file.fieldname,
      }));

      return successResponse(res, files, 'Files uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req, res, next) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);

      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (error) {
        throw new AppError('File not found', 404);
      }

      return successResponse(res, null, 'File deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFileInfo(req, res, next) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);

      try {
        const stats = await fs.stat(filePath);
        return successResponse(res, {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        }, 'File info fetched successfully');
      } catch (error) {
        throw new AppError('File not found', 404);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();