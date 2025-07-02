import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
try {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment variables from ${envPath}`);
} catch (error) {
  console.warn(`⚠️  Could not load .env file: ${error.message}`);
  console.log('ℹ️  Make sure environment variables are set in your hosting environment.');
}

// Check for required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'FRONTEND_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.log('\n💡 Make sure to set these variables in your hosting environment.');
  process.exit(1);
}

// Log success with masked sensitive values
console.log('✅ All required environment variables are set!');
console.log('Environment:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`- MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not Set'}`);
console.log(`- CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not Set'}`);
console.log(`- RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? 'Set' : 'Not Set'}`);
console.log(`- FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not Set'}`);

process.exit(0);
