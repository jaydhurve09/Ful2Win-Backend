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
import chatRouter from './routes/chatRouter.js'; // Assuming you have a chatRouter defined in routes/chatRoute.js
//import walletRouter from './routes/walletRoute.js'; // Assuming you have a walletRouter defined in routes/walletRoute.js
import gameRouter from './routes/gameRoute.js'; // Assuming you have a gameRouter defined in routes/gameRoute.js
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

//app.use("/wallet", walletRouter); // Assuming you have a walletRouter defined in routes/walletRoute.js
app.use('/users', userRouter); // Assuming you have a userRouter defined in routes/userRoute.js
// Set port
app.use('/score',  gameRouter); // Assuming you have a gameRouter defined in routes/gameRoute.js
app.use('/post', postRouter); // Assuming you have a postRouter defined in routes/postRoute.js
app.use('chat',chatRouter);
// Start server

 export default app;
// Export the app for testing or further configuration