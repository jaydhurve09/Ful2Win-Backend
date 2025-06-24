import e from "express";
import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
  // Extract token from Authorization header
  

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
try{
  const decoded= jwt.verify(token, process.env.JWT_SECRET);
  
  req.body.userId= decoded.id;
  next();
} catch (error) {
  return res.status(403).json({ message: error.message }); 
}
};

export default authUser;
