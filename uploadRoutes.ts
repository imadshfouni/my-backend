import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { APIController } from '../controllers/APIController';
import { ConfigManager } from '../utils/config';
import { ValidationError } from '../utils/errors';

const router = Router();
const apiController = new APIController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = ConfigManager.get('UPLOAD_DIR', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent collisions
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const extension = path.extname(file.originalname);
    cb(null, `chart-${uniqueSuffix}${extension}`);
  }
});

// File filter to allow only images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check mime type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only image files are allowed'));
  }
};

// Configure upload limits
const maxSize = ConfigManager.getNumber('MAX_UPLOAD_SIZE', 10) * 1024 * 1024; // Convert MB to bytes

// Initialize multer
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: maxSize }
});

/**
 * @route POST /api/upload
 * @description Upload and analyze a forex chart image
 * @body {File} image - Chart image file
 * @body {string} sessionId - User session ID
 * @body {string} prompt - Optional analysis prompt
 * @returns {object} AI analysis
 */
router.post('/', upload.single('image'), apiController.handleImageUpload);

export default router;