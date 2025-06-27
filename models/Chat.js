import mongoose from 'mongoose';


const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Message = mongoose.models.Message||mongoose.model('Message', messageSchema);

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, { timestamps: true });

// Index for faster query
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });
const ChatModel = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export { ChatModel, Message };
