import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import { promisify } from 'util';

const unlinkFile = promisify(fs.unlink);
let isConfigured = false;

// Configure Cloudinary
const configureCloudinary = () => {
  if (isConfigured) {
    console.log('[Cloudinary] Already configured');
    return true;
  }

  console.log('[Cloudinary] Loading configuration...');
  
  // Get environment variables with fallbacks
  const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET_KEY || process.env.CLOUDINARY_SECRET;
  
  console.log('[Cloudinary] Environment variables:', {
    CLOUDINARY_NAME: cloudName ? 'Set' : 'Not set',
    CLOUDINARY_API_KEY: apiKey ? 'Set' : 'Not set',
    CLOUDINARY_SECRET_KEY: apiSecret ? 'Set' : 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
  
  if (!cloudName || !apiKey || !apiSecret) {
    const error = new Error('Missing required Cloudinary configuration');
    console.error('[Cloudinary] Configuration error:', error.message);
    console.error('[Cloudinary] Please check your .env file and ensure all required variables are set');
    throw error;
  }
  
  const config = {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  };
  
  console.log('[Cloudinary] Initializing with config:', {
    ...config,
    api_key: config.api_key ? '***' + config.api_key.slice(-4) : 'Not set',
    api_secret: '***' + (config.api_secret ? config.api_secret.slice(-4) : '')
  });
  
  try {
    cloudinary.config(config);
    isConfigured = true;
    console.log('[Cloudinary] Configuration successful');
    return true;
  } catch (error) {
    console.error('[Cloudinary] Configuration failed:', error);
    throw error;
  }
};

/**
 * Upload a file or data URI to Cloudinary
 * @param {string|Buffer} file - Path to the file, Buffer, or data URI to upload
 * @param {string} folder - Folder in Cloudinary to store the file
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = async (file, folder = 'tournaments') => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }

  try {
    console.log(`[Cloudinary] Starting upload to folder: ${folder}`);
    
    let uploadOptions = {
      folder: `ful2win/${folder}`,
      resource_type: 'auto',
    };

    let result;
    
    if (Buffer.isBuffer(file)) {
      // Handle Buffer (from multer.memoryStorage())
      console.log('[Cloudinary] Uploading from buffer');
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        uploadStream.end(file);
      });
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      // Handle data URI
      console.log('[Cloudinary] Uploading from data URI');
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else if (typeof file === 'string') {
      // Handle file path (legacy)
      console.log(`[Cloudinary] Uploading file from path: ${file}`);
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else {
      throw new Error('Invalid file type. Must be a file path, Buffer, or data URI');
    }
    
    console.log('[Cloudinary] Upload successful:', result.secure_url);
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error.message);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

const connectCloudinary = async () => {
  try {
    // Configure Cloudinary if not already configured
    if (!isConfigured) {
      configureCloudinary();
    }
    
    // Test the connection by making a simple API call
    const result = await cloudinary.api.ping();
    console.log('[Cloudinary] Connection test successful:', result);
    return true;
  } catch (error) {
    console.error('[Cloudinary] Connection test failed:', error.message);
    // Don't throw here to allow the server to start without Cloudinary if it's not critical
    return false;
  }
};

// Export the Cloudinary client and utilities
export { 
  connectCloudinary, 
  uploadToCloudinary, 
  deleteFromCloudinary, 
  cloudinary,
  isConfigured
};

// Export isConfigured as a getter to always return the current state
export const getCloudinaryStatus = () => isConfigured;

export default connectCloudinary;