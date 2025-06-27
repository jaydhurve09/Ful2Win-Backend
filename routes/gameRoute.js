import express from 'express';
const Gamerouter = express.Router();
import { gameScore,MyScore,getScore,PlayedTournaments } from '../controllers/gameScoreController.js';



Gamerouter.post('/submit-score', gameScore);
Gamerouter.post('/Myscore', MyScore);
Gamerouter.post('/get-score', getScore);
Gamerouter.post('/isplay', PlayedTournaments);
export default Gamerouter;