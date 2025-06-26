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

const router = express.Router();

// Create a new post with image upload
router.post('/create', upload.single('image'), handleMulterError, createPost);

// Delete a post
router.post('/remove', deletePost);

// Update a post
router.post('/update', updatePost);

// Like a post
router.post('/like', likePost);

// Unlike a post
router.post('/unlike', unlikePost);

// Comment on a post
router.post('/comment', commentOnPost);

// Get all posts (commented out as per original)
// router.post('/getPosts', getPosts);

// Get post with details (commented out as per original)
// router.post('/getPostWithDetails', getPostWithDetails);

export default router;