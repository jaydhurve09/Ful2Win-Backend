import { Socket } from "socket.io";
import { Server } from "socket.io";
import {Message,ChatModel}  from "./models/Chat.js";


 
let io;
 const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // You can add more event listeners here
    // For example, to handle a chat message
    socket.on("join",(userId) => {
      console.log("User joined:", userId);
      io.emit("userJoined", userId);
    });
    
    socket.on("sendMessage", async (data) => {
      console.log("Message sent:", data);
      //check if chat exists
      let chat = await ChatModel.findOne({
        participants: { $all: [data.senderId, data.receiverId] }
      });
        if (!chat) {
            // Create a new chat if it doesn't exist
            chat = new ChatModel({
            participants: [data.senderId, data.receiverId]
            });
            await chat.save();
        }
        // Create a new message
        const message = new Message({
          chat: chat._id,
          sender: data.senderId,
          content: data.content
        });
        await message.save();
    });
    
    
    
    
    
      socket.on("message", (data) => {
      console.log("Message received:", data);
      // Broadcast the message to all connected clients
      io.emit("message", data);
    });
     io.on("disconnect", (socket) => {
      console.log("User disconnected:", socket.id);
    });
  
  });
   
};
export { initSocket };