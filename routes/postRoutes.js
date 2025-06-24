const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect, admin, ownerOrAdmin } = require('../middleware/authMiddleware');
const { uploadPostMedia } = require('../middleware/uploadMiddleware');

// Create a new post with media upload
router.post(
  '/',
  protect,
  uploadPostMedia.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
  ]),
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
  ownerOrAdmin(Post, 'author'),
  uploadPostMedia.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
  ]),
  postController.updatePost
);

// Delete a post
router.delete('/:id', protect, ownerOrAdmin(Post, 'author'), postController.deletePost);

// Like/Unlike a post
router.post('/:id/like', protect, postController.likePost);

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
  ownerOrAdmin(Comment, 'author'),
  postController.updateComment
);

// Delete a comment
router.delete(
  '/:id/comments/:commentId',
  protect,
  ownerOrAdmin(Comment, 'author'),
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

module.exports = router;
