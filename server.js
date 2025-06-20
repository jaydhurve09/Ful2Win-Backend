import express from 'express';
import cors from 'cors';
import "dotenv/config";
import connectCloudinary from './config/Cloudinary.js'; // Assuming you have a Cloudinary// Assuming you have a db.js file for database connectio
const PORT = process.env.PORT || 5000;
const app = express();
import connectDB from './config/mongodb.js'; // Assuming you have a db.js file for database connection
import postRouter from './routes/postRoute.js'; // Assuming you have a postRouter defined in routes/postRoute.js

// Middleware
app.use(cors());
app.use(express.json());
connectDB(); // Connect to MongoDB
connectCloudinary(); // Connect to Cloudinary
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ful2Win Backend API' });
});

// Set port
app.use('/post', postRouter); // Assuming you have a postRouter defined in routes/postRoute.js

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
