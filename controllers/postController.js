import { v2 as cloudinary } from 'cloudinary';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import fs from 'fs'; 
/**
 * @desc    Create a new post
 * @route   POST /api/posts
 * @access  Private
 */
const createPost = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { content, tags } = req.body;
    const author = req.user.id; // Get user ID from auth middleware

    // Validate required fields
    if (!content && (!req.file || !req.file.path)) {
      return res.status(400).json({ 
        success: false,
        message: 'Either content or an image is required' 
      });
    }

    // Create post data object
    const postData = {
      title: content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'New Post',
      content: content || '',
      author,
      tags: (tags && typeof tags === 'string') ? tags.split(',').map(tag => tag.trim()) : []
    };

    // Handle file upload if present
    if (req.file) {
      try {
        // Ensure Cloudinary is configured
        const { connectCloudinary } = await import('../config/cloudinary.js');
        await connectCloudinary();
        
        const fileData = fs.readFileSync(req.file.path);
        const dataUri = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
        
        // Upload to Cloudinary using the configured function
        console.log('[Cloudinary] Attempting to upload file to Cloudinary...');
        const result = await uploadToCloudinary(dataUri, 'posts');
        
        // Add media to post data based on resource type
        if (result && result.secure_url) {
          postData.media = {
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type || 'image',
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration
          };
          
          // Set the images array for compatibility
          if (result.resource_type === 'image') {
            postData.images = [{
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height
            }];
          }
        }
      } catch (uploadError) {
        console.error('Error uploading media to Cloudinary:', uploadError);
        return res.status(500).json({ 
          success: false,
          message: 'Error uploading media',
          error: uploadError.message 
        });
      }
    }

    // Create and save the post
    const newPost = new Post(postData);
    await newPost.save();
    
    // Populate author details for the response
    await newPost.populate({
      path: 'author',
      select: 'username name verified'
    });

    res.status(201).json({
      _id: newPost._id,
      content: newPost.content,
      image: newPost.images?.[0]?.url,
      user: {
        _id: newPost.author._id,
        username: newPost.author.username,
        name: newPost.author.name,
        verified: newPost.author.verified
      },
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ 
      message: error.message || "Internal server error" 
    });
  }
}

/**
 * @desc    Update a post
 * @route   PUT /api/posts/:id
 * @access  Private
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user.id;

    // Find the post by ID
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Verify post ownership
    if (post.author.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this post' 
      });
    }

    // Update post fields if provided
    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = tags.split(',').map(tag => tag.trim());
    
    // Handle file upload if present
    if (req.file) {
      try {
        // Delete old media if exists
        if (post.media?.publicId) {
          await cloudinary.uploader.destroy(post.media.publicId);
        }

        // Upload new media
        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await uploadToCloudinary(dataUri, 'posts');
        
        if (result && result.secure_url) {
          post.media = {
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type || 'image',
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration
          };
        }
      } catch (uploadError) {
        console.error('Error updating post media:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating post media' 
        });
      }
    }

    post.updatedAt = Date.now();
    const updatedPost = await post.save();

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

/**
 * @desc    Delete a post
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the post by ID
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }

    // Verify post ownership
    if (post.author.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this post' 
      });
    }

    // Delete media from Cloudinary if exists
    if (post.media?.publicId) {
      try {
        await cloudinary.uploader.destroy(post.media.publicId, {
          resource_type: post.media.resourceType || 'image'
        });
      } catch (cloudinaryError) {
        console.error('Error deleting media from Cloudinary:', cloudinaryError);
        // Continue with post deletion even if media deletion fails
      }
    }

    // Delete the post
    await Post.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

/**
 * @desc    Like a post
 * @route   POST /api/posts/like
 * @access  Private
 */
const likePost = async (req, res) => {
  try {
    const { postId, } = req.body;
    const userId = req.user.id;
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has already liked the post
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: "You have already liked this post" });
    }

    // Add the user ID to the likes array
    post.likes.push(userId);
    // Save the updated post
    const updatedPost = await post.save();
    res.status(200).json({
      message: "Post liked successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @desc    Unlike a post
 * @route   POST /api/posts/unlike
 * @access  Private
 */
const unlikePost = async (req, res) => {
  try {
    const { postId} = req.body;
    const userId = req.user.id;
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the user has not liked the post
    if (!post.likes.includes(userId)) {
      return res.status(400).json({ message: "You have not liked this post" });
    }

    // Remove the user ID from the likes array
    post.likes = post.likes.filter((like) => like !== userId);
    // Save the updated post
    const updatedPost = await post.save();
    res.status(200).json({
      message: "Post unliked successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error unliking post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @desc    Add comment to a post
 * @route   POST /api/posts/:id/comments
 * @access  Private
 */
const addComment = async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;
    const { id: postId } = req.params;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create comment object
    const comment = {
      user: userId,
      content,
      parentComment: parentCommentId || null
    };

    // Add comment to post
    post.comments.push(comment);
    await post.save();

    // Get the created comment with populated user data
    const createdComment = post.comments[post.comments.length - 1];
    await Post.populate(createdComment, {
      path: 'user',
      select: 'fullName profilePicture'
    });

    // Update comment count in user's stats
    await User.findByIdAndUpdate(userId, { $inc: { 'stats.commentCount': 1 } });

    res.status(201).json({
      success: true,
      data: createdComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

/**
 * @desc    Update a comment
 * @route   PUT /api/posts/:postId/comments/:commentId
 * @access  Private
 */
const updateComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment author or admin
    if (comment.user.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    comment.updatedAt = new Date();
    
    await post.save();

    res.json({
      success: true,
      data: comment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/posts/:postId/comments/:commentId
 * @access  Private
 */
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment author, post author, or admin
    const isCommentAuthor = comment.user.toString() === userId.toString();
    const isPostAuthor = post.author.toString() === userId.toString();
    
    if (!isCommentAuthor && !isPostAuthor && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Remove comment
    post.comments = post.comments.filter(c => c._id.toString() !== commentId);
    await post.save();

    // Update comment count in user's stats
    await User.findByIdAndUpdate(comment.user, { $inc: { 'stats.commentCount': -1 } });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

/**
 * @desc    Like a comment
 * @route   POST /api/posts/:postId/comments/:commentId/like
 * @access  Private
 */
const likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if already liked
    const alreadyLiked = comment.likes.some(likeId => likeId.toString() === userId.toString());
    if (alreadyLiked) {
      return res.status(400).json({
        success: false,
        message: 'Comment already liked'
      });
    }

    // Add like
    comment.likes.push(userId);
    await post.save();

    res.json({
      success: true,
      message: 'Comment liked successfully',
      likeCount: comment.likes.length
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking comment',
      error: error.message
    });
  }
};

/**
 * @desc    Unlike a comment
 * @route   DELETE /api/posts/:postId/comments/:commentId/like
 * @access  Private
 */
const unlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if not liked
    const likeIndex = comment.likes.findIndex(likeId => likeId.toString() === userId.toString());
    if (likeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Comment not liked yet'
      });
    }

    // Remove like
    comment.likes.splice(likeIndex, 1);
    await post.save();

    res.json({
      success: true,
      message: 'Comment unliked successfully',
      likeCount: comment.likes.length
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error unliking comment',
      error: error.message
    });
  }
};

/**
 * @desc    Save/unsave a post
 * @route   POST /api/posts/:id/save
 * @access  Private
 */
const toggleSavePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const user = await User.findById(userId);
    const isSaved = user.savedPosts.includes(postId);

    if (isSaved) {
      // Unsave post
      user.savedPosts = user.savedPosts.filter(id => id.toString() !== postId);
      await user.save();
      
      return res.json({
        success: true,
        isSaved: false,
        message: 'Post unsaved successfully'
      });
    } else {
      // Save post
      user.savedPosts.push(postId);
      await user.save();
      
      return res.json({
        success: true,
        isSaved: true,
        message: 'Post saved successfully'
      });
    }
  } catch (error) {
    console.error('Error toggling save post:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving post',
      error: error.message
    });
  }
};

/**
 * @desc    Report a post
 * @route   POST /api/posts/:id/report
 * @access  Private
 */
const reportPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if already reported by this user
    const alreadyReported = post.reports.some(report => 
      report.user.toString() === userId.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this post'
      });
    }

    // Add report
    post.reports.push({
      user: userId,
      reason,
      reportedAt: new Date()
    });

    await post.save();

    // TODO: Notify admin about the report

    res.json({
      success: true,
      message: 'Post reported successfully'
    });
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting post',
      error: error.message
    });
  }
};

/**
 * @desc    Add comment to a post
 * @route   POST /api/posts/comment
 * @access  Private
 */
const commentOnPost = async (req, res) => {
  try {
    const { postId, userId, comment } = req.body;
    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    } 
  
    // Create a new comment object
    const newComment = {
      user: userId,
      comment: comment,
      date: new Date(),
    };
    // Add the new comment to the post's comments array
    post.comments.push(newComment);
    // Save the updated post
    const updatedPost = await post.save();
    res.status(200).json({
      message: "Comment added successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error commenting on post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
// Export all controller methods
export {
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  commentOnPost,
  getPosts,
  getPostById,
  getPostsByUser,
  getSavedPosts,
  getTrendingPosts,
  getPostsByTag,
  addComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  replyToComment,
  toggleSavePost,
  reportPost,
  getPostComments,
  getPendingPosts,
  updatePostStatus
};



// Stub implementations for methods that are used in routes but not yet implemented
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePicture');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostsByUser = async (req, res) => {
  try {
    const posts = await Post.find({ 'author': req.params.userId });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    // First verify the user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has the savedPosts field
    if (user.savedPosts === undefined) {
      // If the field doesn't exist, return empty array
      return res.json([]);
    }
    
    // If user has saved posts, return them
    if (user.savedPosts && user.savedPosts.length > 0) {
      const posts = await Post.find({ _id: { $in: user.savedPosts } });
      return res.json(posts);
    }
    
    // If savedPosts exists but is empty, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ 
      message: 'Error fetching saved posts',
      error: error.message 
    });
  }
};

const getTrendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({}).sort({ likes: -1 }).limit(10);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostsByTag = async (req, res) => {
  try {
    const posts = await Post.find({ tags: req.params.tag });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all comments for a post
 * @route   GET /api/posts/:id/comments
 * @access  Private
 */
const getPostComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .select('comments')
      .populate('comments.author', 'username profilePicture')
      .sort({ 'comments.createdAt': -1 });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post.comments);
  } catch (error) {
    console.error('Error getting post comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get all pending posts (admin only)
 * @route   GET /api/posts/admin/pending
 * @access  Private/Admin
 */
const getPendingPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'pending' };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username profilePicture')
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: posts
    });
  } catch (error) {
    console.error('Error getting pending posts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

/**
 * @desc    Update post status (admin only)
 * @route   PUT /api/posts/admin/:id/status
 * @access  Private/Admin
 */
const updatePostStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, approved, rejected'
      });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      message: `Post ${status} successfully`,
      data: post
    });
  } catch (error) {
    console.error('Error updating post status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    comment.replies.push({
      text,
      author: req.user.id,
      createdAt: new Date()
    });
    
    await post.save();
    res.json({ message: 'Reply added successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};