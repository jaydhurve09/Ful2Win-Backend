import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Create directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = join(process.cwd(), 'uploads');

// Ensure upload directory exists
const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadsDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const originalName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${originalName}-${uniqueSuffix}${ext}`);
  }
});

// Allowed file types with MIME types
const allowedFileTypes = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif'
};

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeType = file.mimetype;
    
    // Check if the file type is allowed
    if (!(mimeType in allowedFileTypes)) {
      return cb(new Error(`Invalid file type. Only ${Object.keys(allowedFileTypes).join(', ')} are allowed.`), false);
    }
    
    // Check file extension matches the MIME type
    if (allowedFileTypes[mimeType] !== ext) {
      return cb(new Error(`File extension doesn't match the file type.`), false);
    }
    
    // Check file size (in bytes)
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return cb(new Error('File size exceeds the limit of 5MB'), false);
    }
    
    // Check for potential security issues
    if (file.originalname.match(/\.(php|exe|sh|bat|cmd|js|html?|css)$/i)) {
      return cb(new Error('Potentially malicious file detected'), false);
    }
    
    // Everything is fine
    return cb(null, true);
    
  } catch (error) {
    console.error('Error in file filter:', error);
    return cb(error, false);
  }
};

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_FIELD_KEY' || 
        err.code === 'LIMIT_FIELD_VALUE' || err.code === 'LIMIT_FIELD_COUNT' || 
        err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file upload request.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      success: false,
      message: 'An error occurred during file upload',
      error: err.message
    });
  }
  
  // No errors, proceed to next middleware
  next();
};

// Initialize multer with memory storage for Cloudinary
const memoryStorage = multer.memoryStorage();

// File filter for allowed file types
const imageFileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
  }
  cb(null, true);
};

// Initialize multer with configuration for multiple files
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 2 // Allow up to 2 files (thumbnail and coverImage)
  },
  fileFilter: imageFileFilter
});

// Middleware for handling single file upload
export const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    uploadSingle(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  };
};

export { upload, handleMulterError };
