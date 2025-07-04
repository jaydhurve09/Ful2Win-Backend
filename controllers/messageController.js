import Message from '../models/Message.js';

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { recipient, content } = req.body;
    const sender = req.user._id; // assumes auth middleware

    if (!recipient || !content) {
      return res.status(400).json({ error: 'Recipient and content required' });
    }

    const message = await Message.create({ sender, recipient, content });
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    console.log('[getMessages] userId:', userId, 'otherUserId:', otherUserId);

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    console.log(`[getMessages] Found ${messages.length} messages between ${userId} and ${otherUserId}`);
    res.json(messages);
  } catch (err) {
    console.error('[getMessages] Error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Get messages in a conversation between two users via query params (for /api/messages/conversation)
export const conversationMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
      return res.status(400).json({ error: 'Missing user1 or user2 in query params' });
    }
    // Defensive: ensure both are strings
    const u1 = String(user1);
    const u2 = String(user2);
    const messages = await Message.find({
      $or: [
        { sender: u1, recipient: u2 },
        { sender: u2, recipient: u1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('[conversationMessages] Error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};
