import express from 'express';
import { registerUser, loginUser,getUserProfile} from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import multer from 'multer';
import upload from '../middlewares/multer.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/profile', authUser, getUserProfile);
//userRouter.put('/profile', authUser, updateUserProfile);
//userRouter.put('/update-pic',authUser,upload.single('profilePic'),updateProfilePic); // Assuming you have an updateProfilePic function in userController.js

export default userRouter;
