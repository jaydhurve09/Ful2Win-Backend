import mongoose from 'mongoose';

/**
 * Comment subdocument schema
 */
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Main Post schema
 */
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: String,
    publicId: String,
    width: Number,
    height: Number,
    altText: String
  }],
  videos: [{
    url: String,
    publicId: String,
    thumbnail: String,
    duration: Number
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  comments: [commentSchema],
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    name: String
  },
  metadata: {
    title: String,
    description: String,
    keywords: [String],
    ogImage: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });
postSchema.index({ title: 'text', content: 'text', 'tags': 'text' });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Pre-save hook to update timestamps
postSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.updatedAt = Date.now();
  }
  next();
});

const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
export default Post;
