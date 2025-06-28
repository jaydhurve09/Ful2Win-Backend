import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema({
  userId: {
    type: String,  // You can use ObjectId if referencing User collection
    required: true,
  },
  username: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    required: true,
  },
  roomId: {
    type: String,  // You can use ObjectId if referencing Room
    required: true,
  },
  gameName: {
    type: String,
    required: true,
    trim: true
  }
});
const scoreModel =
  mongoose.models.Score || mongoose.model("Score", ScoreSchema);
export default scoreModel;

