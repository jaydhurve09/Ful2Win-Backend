import express from 'express';
import cors from 'cors';
import "dotenv/config";
import connectCloudinary from './config/Cloudinary.js'; // Assuming you have a Cloudinary// Assuming you have a db.js file for database connectio
const PORT = process.env.PORT || 5000;
const app = express();
import connectDB from './config/mongodb.js'; // Assuming you have a db.js file for database connection
import postRouter from './routes/postRouter.js'; // Assuming you have a postRouter defined in routes/postRoute.js
import userRouter from './routes/userRouter.js'; // Assuming you have a userRouter defined in routes/userRoute.js
import cookieParser from 'cookie-parser';

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
connectDB(); // Connect to MongoDB
connectCloudinary(); // Connect to Cloudinary
// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ful2Win Backend API' });
});


app.use('/user', userRouter); // Assuming you have a userRouter defined in routes/userRoute.js
// Set port
app.use('/post', postRouter); // Assuming you have a postRouter defined in routes/postRoute.js

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
