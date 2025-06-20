import { v2 as cloudinary } from "cloudinary";
import Post from "../models/Post.js";

const createPost = async (req, res) => {
  try {
    const {title,content, image,likes,comments, author,createdAt} = req.body;

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
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    console.error("Error creating post:", error);
  }
}
//const getPosts = async (req, res) => {
 // try {
    //fetch all post of login users
  //  const UserId = req.body.userId; // Assuming userId is sent in the request body
  //  const posts = await Post.find({ author: UserId }) 
   //   .populate('comments.user', 'username profilePicture') // Assuming comments have a user field that references a User model
   //   .populate('likes', 'username profilePicture') // Assuming likes have a user field that references a User model
   //   .sort({ createdAt: -1 }); // Sort posts by creation date in descending order
  //  res.status(200).json({ posts: posts, message: "Posts retrieved successfully" });
 // } catch (error) {
 //   console.error("Error retrieving posts:", error);
 //   res.status(500).json({ message: "Internal server error" });
 // }       
 // }

//const getPostWithDetails = async (req, res) => {
//  try {
  //  const { postId } = req.body;
    // Find the post by ID and populate the comments with user details
  //  const post = await Post.findById(postId)
   //   .populate('comments.user', 'username profilePicture') // Assuming comments have a user field that references a User model
   //   .populate('likes', 'username profilePicture') // Assuming likes have a user field that references a User model
   //   if (!post) {
   //     return res.status(404).json({ message: "Post not found" });
   //   }
   // res.status(200).json({ post: post, 
   //   message: "Post retrieved successfully"
  //  });
 // } catch (error) { console.error("Error retrieving post:", error);
 //   res.status(500).json({ message: "Internal server error" });   

 // }}// that two are user model base on the postId
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
    
    // Save the updated post
    const updatedPost = await post.save();
    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  }
 

} catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
  res.status(200).json({ message: "Post updated successfully" });
}
const deletePost = async (req, res) => {
  try {
    const { postId } = req.body;
    // Find the post by ID and delete it
    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      return res.status(404).json({ message: "Post not found" });
    }
} 
 catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
  res.status(200).json({ message: "Post deleted successfully" });
}
const likePost = async (req, res) =>{
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
// unlike post
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
// comment on post
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