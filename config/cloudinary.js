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
  
  try {
    // Get environment variables with fallbacks
    const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY;
    const apiSecret = process.env.CLOUDINARY_SECRET_KEY || process.env.CLOUDINARY_SECRET;
    
    const envStatus = {
      CLOUDINARY_NAME: cloudName ? 'Set' : 'Not set',
      CLOUDINARY_API_KEY: apiKey ? 'Set' : 'Not set',
      CLOUDINARY_SECRET_KEY: apiSecret ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    console.log('[Cloudinary] Environment status:', envStatus);
    
    // If any required variable is missing, log a warning but don't throw
    if (!cloudName || !apiKey || !apiSecret) {
      const missing = [];
      if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
      if (!apiKey) missing.push('CLOUDINARY_API_KEY');
      if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
      
      console.warn(`[Cloudinary] Missing configuration: ${missing.join(', ')}`);
      console.warn('[Cloudinary] Cloudinary features will be disabled');
      return false;
    }
    
    const config = {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    };
    
    console.log('[Cloudinary] Initializing with config:', {
      cloud_name: config.cloud_name,
      api_key: config.api_key ? '***' + config.api_key.slice(-4) : 'Not set',
      api_secret: '***' + (config.api_secret ? config.api_secret.slice(-4) : '')
    });
    
    cloudinary.config(config);
    isConfigured = true;
    console.log('[Cloudinary] Configuration successful');
    return true;
  } catch (error) {
    console.error('[Cloudinary] Configuration failed:', error.message);
    return false;
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
    
    console.log('[Cloudinary] Upload successful:', {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration
    });
    
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration
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
      const configured = configureCloudinary();
      if (!configured) {
        console.warn('[Cloudinary] Skipping connection test - Configuration incomplete');
        return false;
      }
    }
    
    try {
      // Test the connection by making a simple API call
      const result = await cloudinary.api.ping();
      console.log('[Cloudinary] Connection test successful');
      return true;
    } catch (pingError) {
      console.warn('[Cloudinary] Connection test failed, but continuing without Cloudinary');
      console.warn('[Cloudinary] Error details:', pingError.message);
      return false;
    }
  } catch (error) {
    console.error('[Cloudinary] Error during connection:', error.message);
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