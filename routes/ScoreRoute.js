import express from 'express';
const Scorerouter = express.Router();
import { gameScore,MyScore,getScore,PlayedTournaments } from '../controllers/gameScoreController.js';



Scorerouter.post('/submit-score', gameScore);
Scorerouter.post('/Myscore', MyScore);
Scorerouter.post('/get-score', getScore);
Scorerouter.post('/display', PlayedTournaments);
export default Scorerouter;