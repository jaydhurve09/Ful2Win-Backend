import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';
import Post from '../models/Post.js';
import * as postController from '../controllers/postController.js';

const router = express.Router();

// Create a new post (with optional media)
router.post(
  '/',
  protect,
  (req, res, next) => {
    upload.fields([{ name: 'media', maxCount: 1 }])(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  postController.createPost
);

// Get posts with filtering and pagination
router.get('/', protect, postController.getPosts);

// Get a single post by ID
router.get('/:id', protect, postController.getPostById);

// Update a post (also allows optional media update)
router.put(
  '/:id',
  protect,
  (req, res, next) => {
    upload.fields([{ name: 'media', maxCount: 1 }])(req, res, (err) => {
      if (err) return handleMulterError(err, req, res, next);
      next();
    });
  },
  postController.updatePost
);

// Delete a post
router.delete('/:id', protect, postController.deletePost);

// Like / Unlike a post
router.post('/like', protect, postController.likePost);
router.post('/unlike', protect, postController.unlikePost);

// Save / Unsave a post
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
  async (req, res, next) => {
    try {
      const post = await Post.findOne(
        { 'comments._id': req.params.commentId },
        { 'comments.$': 1 }
      );
      if (!post) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      const comment = post.comments[0];
      if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this comment' });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  postController.updateComment
);

// Delete a comment
router.delete(
  '/:id/comments/:commentId',
  protect,
  async (req, res, next) => {
    try {
      const post = await Post.findOne(
        { 'comments._id': req.params.commentId },
        { 'comments.$': 1 }
      );
      if (!post) {
        return res.status(404).json({ message: 'Comment not found' });
      }
      const comment = post.comments[0];
      if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this comment' });
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  postController.deleteComment
);

// Like / Unlike a comment
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
