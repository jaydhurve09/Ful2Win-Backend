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

// File filter for media uploads (images and videos)
const mediaFileFilter = (req, file, cb) => {
  const fileType = file.mimetype.split('/')[0];
  
  // Accept images and videos
  if (!['image', 'video'].includes(fileType)) {
    return cb(new Error('Only image and video files are allowed!'), false);
  }
  
  // For now, accept all image and video files and let Cloudinary handle the validation
  // We'll still check file size and basic security
  try {
    // Check file size (5MB for images, 50MB for videos)
    const maxSize = fileType === 'image' ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return cb(new Error(`File is too large. Maximum size is ${maxSize / (1024 * 1024)}MB for ${fileType}s`), false);
    }
    
    // Basic security check for executable files
    if (file.originalname.match(/\.(php|exe|sh|bat|cmd|js|html?|css|jar|war|ear|apk|msi|dll|so|a|o|py|rb|pl|pm|t|pod|rdf|xml|xsd|xslt|xsl|rss|atom|json|jsonp|webmanifest|htaccess|htpasswd|ini|log|conf|cfg|reg|cmd|bat|vbs|ps1|psm1|psd1|ps1xml|psc1|pssc|cdxml|wsf|wsc|ws|wsh|msh|msh1|msh2|msh3|msh4|msh5|msh6|msh7|msh8|msh9|mshxml|msh1xml|msh2xml|msh3xml|msh4xml|msh5xml|msh6xml|msh7xml|msh8xml|msh9xml|msc1|msc2|msh1|msh2|msh3|msh4|msh5|msh6|msh7|msh8|msh9|mshxml|msh1xml|msh2xml|msh3xml|msh4xml|msh5xml|msh6xml|msh7xml|msh8xml|msh9xml|msc1|msc2)$/i)) {
      return cb(new Error('Potentially malicious file detected'), false);
    }
    
    return cb(null, true);
  } catch (error) {
    console.error('Error in media file filter:', error);
    return cb(error, false);
  }
};

// Initialize multer with configuration for media uploads
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size (for videos)
    files: 10, // Allow multiple files per upload
    fieldSize: 100 * 1024 * 1024, // 100MB max for form data
  },
  fileFilter: mediaFileFilter
});

// Middleware for handling single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    console.log(`[uploadSingle] Initializing upload for field: ${fieldName}`);
    
    const singleUpload = multer({
      storage: memoryStorage,
      fileFilter: mediaFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1,
        fields: 20, // Allow other form fields
        parts: 30   // Total parts (files + fields)
      }
    }).single(fieldName);

    singleUpload(req, res, (err) => {
      if (err) {
        console.error('[uploadSingle] Upload error:', {
          message: err.message,
          code: err.code,
          field: err.field,
          storageErrors: err.storageErrors
        });
        
        let errorMessage = 'Error uploading file';
        let statusCode = 400;
        
        // Handle specific multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          errorMessage = 'File size too large. Maximum size is 5MB.';
          statusCode = 413; // Payload Too Large
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          errorMessage = 'Too many files. Only one file is allowed.';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          errorMessage = `Unexpected file field. Expected field name: ${fieldName}`;
        }
        
        return res.status(statusCode).json({
          success: false,
          message: errorMessage,
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
