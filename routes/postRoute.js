import express from 'express';
import { 
  createPost, 
  updatePost, 
  deletePost, 
  likePost, 
  unlikePost, 
  commentOnPost 
} from '../controllers/postController.js';
import { upload, handleMulterError } from '../middleware/multer.js';

const postRoute = express.Router();

// Create a new post with image upload
postRoute.post('/create', upload.single('image'), handleMulterError, createPost);

// Delete a post
postRoute.post('/remove', deletePost);

// Update a post
postRoute.post('/update', updatePost);

// Like a post
postRoute.post('/like', likePost);

// Unlike a post
postRoute.post('/unlike', unlikePost);

// Comment on a post
postRoute.post('/comment', commentOnPost);

// Get all posts (commented out as per original)
// postRoute.post('/getPosts', getPosts);

// Get post with details (commented out as per original)
// postRoute.post('/getPostWithDetails', getPostWithDetails);

export default postRoute;