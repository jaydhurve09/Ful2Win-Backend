const Message = require('../models/Message');

// Send a message
exports.sendMessage = async (req, res) => {
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
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
};
