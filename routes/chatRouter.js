import express from 'express';
import { createChat } from '../controllers/chatController.js';


const chatRouter = express.Router();
// Route to create a new chat
chatRouter.post('/get-chat', createChat);

//export default chatRouter;
export default chatRouter;