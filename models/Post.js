import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: String,
  comment: String,
  date: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  author: String,
  image: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.String, ref: 'User' }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});
const postModel =
  mongoose.models.Post || mongoose.model("Post", postSchema);
export default postModel;
