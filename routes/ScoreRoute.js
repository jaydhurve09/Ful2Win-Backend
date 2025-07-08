import express from 'express';
const Scorerouter = express.Router();
import { gameScore,MyScore,getScore,PlayedTournaments } from '../controllers/gameScoreController.js';



Scorerouter.post('/submit-score', gameScore);
Scorerouter.post('/Myscore', MyScore);
// Handle both GET and POST for /get-score
Scorerouter.route('/get-score')
  .get(getScore)
  .post(getScore);
Scorerouter.post('/display', PlayedTournaments);
export default Scorerouter;