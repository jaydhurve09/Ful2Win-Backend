import { v2 as cloudinary } from 'cloudinary';
import Post from '../models/Post.js';

/**
 * @desc    Create a new post
 * @route   POST /api/posts/create
 * @access  Private
 */
const createPost = async (req, res) => {
  try {
    const { title, content, likes, comments, author, createdAt } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "posts",
      use_filename: true,
      unique_filename: false,
    });

    // Create a new post
    const newPost = new Post({
      title,
      content,
      image: result.secure_url, // Store the secure URL of the uploaded image
      author,
      likes,
      comments,
      createdAt
    });
    // Save the post to the database
    await newPost.save();
    res.status(201).json({
      message: "Post created successfully"
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @desc    Update a post
 * @route   POST /api/posts/update
 * @access  Private
 */
const updatePost = async (req, res) => {
  try {
    const { postId, title, content, image, likes, comments } = req.body;

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Update the post fields
    post.title = title || post.title;
    post.content = content || post.content;
    post.likes = likes || post.likes;
    post.comments = comments || post.comments;
    if (image) {
      // If a new image is provided, upload it to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "posts",
        use_filename: true,
        unique_filename: false,
      });
      post.image = result.secure_url; // Update the image URL
    }

    // Save the updated post
    const updatedPost = await post.save();
    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @desc    Delete a post
 * @route   POST /api/posts/remove
 * @access  Private
 */
const deletePost = async (req, res) => {
  try {
    const { postId } = req.body;
    // Find the post by ID and delete it
    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @desc    Like a post
 * @route   POST /api/posts/like
 * @access  Private
 */
const likePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
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
    const { postId, userId } = req.body;
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
//
//exportmodels
export { createPost, updatePost, deletePost, likePost, unlikePost, commentOnPost };