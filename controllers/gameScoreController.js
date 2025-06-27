import scoreModel from "../models/Score.js";


 const gameScore =  async (req, res) => {
    try {
      const { userId, score, roomId, gameName } = req.body;

      if (!userId || !score || !roomId || !gameName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      //firstcheck user alredy play this room  or not
      const existingScore = await scoreModel.findOne({ userId , roomId, gameName });
      if (existingScore) {
        console.log("User has already played this room, updating score.");
        // If the user has already played this room, check if the new score is higher
        if (score > existingScore.score) {
          existingScore.score = score; // Update the score if the new one is higher
          await existingScore.save();
          return res.status(200).json({ message: "Score updated successfully", score: existingScore });
        }
        return res.status(200).json({ message: "Score not updated, existing score is higher or equal", score: existingScore });
      }
        


      const newScore = new scoreModel({
        userId,
        score,
        roomId,
        gameName
      });

      await newScore.save();
      return res.status(201).json({ message: "Score saved successfully", score: newScore });
    } catch (error) {
      console.error("Error saving score:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
//update score
const MyScore = async (req, res) => {
    try {
      const { userId, roomId, gameName } = req.body;

      if (!userId || !roomId || !gameName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Find the score for the user in the specified room and game
      const score = await scoreModel.findOne({ userId, roomId, gameName });

      if (!score) {
        return res.status(404).json({ message: "Score not found" });
      }

      return res.status(200).json({ message: "Score retrieved successfully", score });
    } catch (error) {
      console.error("Error retrieving score:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
  // get score of all user of this room
 const getScore = async (req, res) => {
  try {
    const { roomId, gameName } = req.body;

    if (!roomId || !gameName) {
      return res.status(400).json({ message: "Room ID and Game Name are required" });
    }

    // This line WILL return all scores that match both roomId and gameName
    const scores = await scoreModel.find({ roomId, gameName }).sort({ score: -1 });

    if (!scores || scores.length === 0) {
      return res.status(404).json({ message: "No scores found for this room and game" });
    }

    return res.status(200).json({
      message: "Scores retrieved successfully",
      total: scores.length,
      scores, // all scores for given room and game
    });
  } catch (error) {
    console.error("Error retrieving scores:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// POST /score/played-tournaments
const PlayedTournaments = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const played = await scoreModel.find({ userId }).select("roomId gameName -_id");
    return res.status(200).json({ played });
  } catch (error) {
    console.error("Error fetching played tournaments:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

  
// Export the controller
export {
  gameScore, getScore, MyScore,
  PlayedTournaments
}
