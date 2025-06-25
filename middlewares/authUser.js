import e from "express";
import jwt from "jsonwebtoken";
import UserModel from "../models/User.js"; // Import your user model

const authUser = async (req, res, next) => {
  const token = req.cookies.token||req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
try{
  const decoded= jwt.verify(token, process.env.JWT_SECRET);
  const user = await UserModel.findById(decoded.id); // Extract user ID from decoded token

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  console.log(user);

  req.user = user;
  next();
} catch (error) {
  return res.status(403).json({ message: error.message }); 
}
};

export default authUser;
