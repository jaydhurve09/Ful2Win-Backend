import userModel from "../models/User.js";
import scoreModel from "../models/Score.js";
import Tournament from "../models/Tournament.js";


const gameScore = async (req, res) => {
  try {
    console.log('Request headers:', req.headers);
    console.log('Raw body:', req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request body',
        received: req.body
      });
    }

    const { userId, userName, score, roomId, gameName, gameId } = req.body;
    console.log('Parsed score submission:', { userId, userName, score, roomId, gameName, gameId });
    
    // Validate required fields
    const missingFields = [];
    if (!userId) missingFields.push('userId');
    if (score === undefined || score === null) missingFields.push('score');
    if (!roomId) missingFields.push('roomId');
    if (!gameName) missingFields.push('gameName');
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields',
        missingFields
      });
    }
// get usermodel also
 
   

    // Step 1: Auto-register if not already registered
    const tournament = await Tournament.findById(roomId);
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }


    // Step 2: Check if the user already submitted a score
    const existingScore = await scoreModel.findOne({ userId, roomId, gameName });
    if (existingScore) {
      console.log("User has already played this room, updating score.");

      if (!existingScore.username) {
        existingScore.username = userName;
        await existingScore.save();
      }

      if (score > existingScore.score) {
        existingScore.score = score;
        await existingScore.save();
        return res.status(200).json({ message: "Score updated successfully", score: existingScore });
      }

      return res.status(200).json({ message: "Score not updated, existing score is higher or equal", score: existingScore });
    }

    // Step 3: New score submission
    const newScore = new scoreModel({
      userId,
      username: userName,
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
};

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
    console.log('[getScore] Request received:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: req.body,
      params: req.params
    });

    // Get from query params if GET, from body if POST
    const { roomId, gameName } = req.method === 'GET' ? req.query : req.body;
    
    console.log('[getScore] Extracted parameters:', { roomId, gameName });
    
    if (!roomId || !gameName) {
      const errorMsg = 'Room ID and Game Name are required';
      console.error(`[getScore] ${errorMsg}`, { roomId, gameName });
      return res.status(400).json({ 
        message: errorMsg,
        received: { roomId, gameName },
        method: req.method
      });
    }

    console.log('[getScore] Querying database with:', { roomId, gameName });
    
    // This line WILL return all scores that match both roomId and gameName
    const scores = await scoreModel.find({ roomId, gameName }).sort({ score: -1 });
    console.log('[getScore] Database query results:', { found: scores?.length || 0 });

    if (!scores || scores.length === 0) {
      console.log('[getScore] No scores found for:', { roomId, gameName });
      return res.status(404).json({ 
        message: "No scores found for this room and game",
        roomId,
        gameName
      });
    }

    const response = {
      message: "Scores retrieved successfully",
      total: scores.length,
      scores,
      requestDetails: {
        roomId,
        gameName,
        timestamp: new Date().toISOString()
      }
    };

    console.log('[getScore] Sending response with scores:', { 
      total: response.total,
      sampleScore: response.scores[0] 
    });
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('[getScore] Error:', {
      message: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        body: req.body
      }
    });
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
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
