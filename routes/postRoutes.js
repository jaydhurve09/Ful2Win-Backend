import express from 'express';
import { protect, admin, ownerOrAdmin } from '../middleware/authMiddleware.js';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';
import Post from '../models/Post.js';

const router = express.Router();

// Import the postController methods
import * as postController from '../controllers/postController.js';

// Create a new post (with optional media)
router.post(
  '/',
  protect,
  (req, res, next) => {
    // Use the upload middleware with memory storage for Cloudinary
    upload.single('media')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  postController.createPost
);

// Get posts with filtering and pagination
router.get('/', protect, postController.getPosts);

// Get a single post by ID
router.get('/:id', protect, postController.getPostById);

// Update a post
router.put(
  '/:id',
  protect,
  (req, res, next) => {
    // First verify the post exists and user is the author or admin
    Post.findById(req.params.id)
      .then(post => {
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is the author or admin
        if (post.author.toString() !== req.user.id && !req.user.isAdmin) {
          return res.status(403).json({ 
            message: 'Not authorized to update this post' 
          });
        }
        
        // Add the post to the request object for use in the controller
        req.post = post;
        next();
      })
      .catch(next);
  },
  (req, res, next) => {
    // Use the upload middleware
    uploadPostMedia(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  postController.updatePost
);

// Delete a post
router.delete(
  '/:id', 
  protect,
  (req, res, next) => {
    // First verify the post exists and user is the author or admin
    Post.findById(req.params.id)
      .then(post => {
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }
        
        // Check if user is the author or admin
        if (post.author.toString() !== req.user.id && !req.user.isAdmin) {
          return res.status(403).json({ 
            message: 'Not authorized to delete this post' 
          });
        }
        
        // Add the post to the request object for use in the controller
        req.post = post;
        next();
      })
      .catch(next);
  },
  postController.deletePost
);

// Like/Unlike a post (expects { postId, userId } in request body)
router.post('/like', protect, postController.likePost);

// Save/Unsave a post
router.post('/:id/save', protect, postController.toggleSavePost);

// Report a post
router.post('/:id/report', protect, postController.reportPost);

// Get comments for a post
router.get('/:id/comments', protect, postController.getPostComments);

// Add a comment to a post
router.post('/:id/comments', protect, postController.addComment);

// Update a comment
router.put(
  '/:id/comments/:commentId',
  protect,
  (req, res, next) => {
    // Find the comment and check ownership
    Post.findOne(
      { 'comments._id': req.params.commentId },
      { 'comments.$': 1 }
    )
    .then(post => {
      if (!post) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      const comment = post.comments[0];
      if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this comment' });
      }
      next();
    })
    .catch(next);
  },
  postController.updateComment
);

// Delete a comment
router.delete(
  '/:id/comments/:commentId',
  protect,
  (req, res, next) => {
    // Find the comment and check ownership
    Post.findOne(
      { 'comments._id': req.params.commentId },
      { 'comments.$': 1 }
    )
    .then(post => {
      if (!post) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      const comment = post.comments[0];
      if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this comment' });
      }
      next();
    })
    .catch(next);
  },
  postController.deleteComment
);

// Like/Unlike a comment
router.post('/:id/comments/:commentId/like', protect, postController.likeComment);

// Reply to a comment
router.post('/:id/comments/:commentId/reply', protect, postController.replyToComment);

// Get posts by user
router.get('/user/:userId', protect, postController.getPostsByUser);

// Get saved posts for current user
router.get('/saved/me', protect, postController.getSavedPosts);

// Get trending posts
router.get('/explore/trending', protect, postController.getTrendingPosts);

// Get posts by tag
router.get('/tag/:tag', protect, postController.getPostsByTag);

// Admin routes
router.get('/admin/pending', protect, admin, postController.getPendingPosts);
router.put('/admin/:id/status', protect, admin, postController.updatePostStatus);

export default router;
