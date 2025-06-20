import express from 'express';
import { createPost,  updatePost, deletePost,likePost,unlikePost,commentOnPost} from '../controllers/postController.js';
import upload from '../middlewares/multer.js';

const postRouter = express.Router();
// Route to create a new post
postRouter.post('/create', upload.single('image'), createPost); // Middleware to handle file upload create post route
postRouter.post('/remove', deletePost); // Route to delete a post
// Route to update a post
postRouter.post('/update', updatePost);
//postRouter.post('/getPosts', getPosts); // Route to get all posts
// Route to like a post
postRouter.post('/like', likePost);
// Route to unlike a post
postRouter.post('/unlike', unlikePost); 
// Route to comment on a post
postRouter.post('/comment', commentOnPost);
//postRouter.post('/getPostWithDetails', getPostWithDetails); // Route to get a post with details

//export the postRouter
export default postRouter;
//add authentication is pending