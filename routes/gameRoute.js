import express from 'express';
const Gamerouter = express.Router();
import { gameScore,MyScore,getScore } from '../controllers/gameScoreController.js';



Gamerouter.post('/submit-score', gameScore);
Gamerouter.post('/Myscore', MyScore);
Gamerouter.post('/get-score', getScore);
export default Gamerouter;