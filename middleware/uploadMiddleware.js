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

// Allowed file types with MIME types and extensions
const allowedFileTypes = {
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  // Videos
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-ms-wmv': 'wmv',
  'video/x-matroska': 'mkv'
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  'image': 5 * 1024 * 1024,      // 5MB for images
  'video': 50 * 1024 * 1024,     // 50MB for videos
  'default': 10 * 1024 * 1024    // 10MB default
};

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeType = file.mimetype;
    
    // Get the expected extension for this MIME type
    const expectedExt = allowedFileTypes[mimeType];
    
    // Check if the file type is allowed
    if (!expectedExt) {
      return cb(new Error(`Invalid file type. Only images and videos are allowed.`), false);
    }
    
    // Check if the file extension is one of the allowed extensions for this MIME type
    const allowedExtensions = Object.entries(allowedFileTypes)
      .filter(([_, ext]) => ext === expectedExt)
      .map(([mime]) => mime.split('/').pop());
    
    // Get file type category (image or video)
    const fileTypeCategory = mimeType.split('/')[0];
    
    // Check if the file extension is allowed
    if (!allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(`.${ext}`))) {
      return cb(new Error(`Invalid file extension for ${fileTypeCategory}. Allowed extensions: ${allowedExtensions.join(', ')}`), false);
    }
    
    // Check file size based on file type
    const maxSize = MAX_FILE_SIZES[fileTypeCategory] || MAX_FILE_SIZES['default'];
    
    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return cb(new Error(`File size exceeds the limit of ${maxSizeMB}MB for ${fileTypeCategory}s`), false);
    }
    
    // Check for potential security issues
    if (file.originalname.match(/\.(php|exe|sh|bat|cmd|js|html?|css|jar|war|ear|apk|msi|dll|so|a|o|py|rb|pl|pm|t|pod|rdf|xml|xsd|xslt|xsl|rss|atom|json|jsonp|webmanifest|htaccess|htpasswd|ini|log|conf|cfg|reg|cmd|bat|vbs|ps1|psm1|psd1|ps1xml|psc1|pssc|cdxml|wsf|wsc|ws|wsh|msh|msh1|msh2|msh3|msh4|msh5|msh6|msh7|msh8|msh9|mshxml|msh1xml|msh2xml|msh3xml|msh4xml|msh5xml|msh6xml|msh7xml|msh8xml|msh9xml|msc1|msc2|msh1|msh2|msh3|msh4|msh5|msh6|msh7|msh8|msh9|mshxml|msh1xml|msh2xml|msh3xml|msh4xml|msh5xml|msh6xml|msh7xml|msh8xml|msh9xml|msc1|msc2)$/i)) {
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

// File filter for profile picture uploads (images only)
const mediaFileFilter = (req, file, cb) => {
  // Only accept image files
  if (!file.mimetype.startsWith('image/')) {
    const error = new Error('Only image files are allowed for profile pictures!');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // Check for allowed image types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed!');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }
  
  // File is valid
  return cb(null, true);
};

// Initialize multer with configuration for profile picture uploads
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for profile pictures
    files: 1, // Limit to 1 file per request
    fields: 20 // Allow up to 20 non-file fields
  },
  fileFilter: mediaFileFilter
});

/**
 * Middleware for handling single file upload for profile pictures
 * @param {string} fieldName - The name of the file field in the form (should be 'profilePicture')
 */
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    // Log the incoming request for debugging
    console.log('Upload middleware - Request headers:', req.headers);
    console.log('Upload middleware - Content-Type:', req.headers['content-type']);
    
    const uploadSingleFile = upload.single(fieldName);
    
    uploadSingleFile(req, res, (err) => {
      if (err) {
        console.error('File upload error:', {
          code: err.code,
          message: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        
        // Handle specific multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'Profile picture is too large. Maximum size is 5MB.'
          });
        }
        
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(415).json({
            success: false,
            message: 'Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.'
          });
        }
        
        // Handle other multer errors
        return res.status(400).json({
          success: false,
          message: 'Error uploading profile picture',
          error: process.env.NODE_ENV === 'development' ? err.message : 'Upload failed',
          code: err.code || 'UPLOAD_ERROR'
        });
      }
      
      // Log successful upload
      if (req.file) {
        console.log('[uploadSingle] File uploaded successfully:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer'
        });
      } else {
        console.log('[uploadSingle] No file was uploaded');
      }
      
      next();
    });
  };
};

export { upload, uploadSingle, handleMulterError };
