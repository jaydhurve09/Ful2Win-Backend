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
