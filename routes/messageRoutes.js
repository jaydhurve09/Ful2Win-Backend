const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth'); // assumes you have auth middleware

router.post('/', auth, messageController.sendMessage);
router.get('/:otherUserId', auth, messageController.getMessages);

module.exports = router;
