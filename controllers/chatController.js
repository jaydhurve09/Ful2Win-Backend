import mongoose from "mongoose";
import { ChatModel, Message } from "../models/Chat.js";

// Function to create a new chat
const createChat = async (req, res) => {
  const { userId, friendId } = req.body;

  if (!userId || !friendId) {
    return res.status(400).json({ message: "User ID and Friend ID are required" });
  }

  try {
    // Check if a chat already exists between the two users
    let chat = await ChatModel.findOne({
      participants: { $all: [userId, friendId] }
    });

    if (!chat) {
      // Create a new chat if it doesn't exist
      chat = new ChatModel({
        participants: [userId, friendId]
      });
      await chat.save();
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export {createChat};