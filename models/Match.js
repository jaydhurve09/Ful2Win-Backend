import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  player_id: { type: String, required: true },
  player_name: { type: String, required: true },
  score: { type: Number, default: null }
});

const matchSchema = new mongoose.Schema({
  match_id: { type: String, required: true, unique: true },
  game: { type: String, required: true },
  entry_fee: { type: Number, required: true },
  players: [playerSchema],
  winner: {
    player_id: { type: String, default: null },
    player_name: { type: String, default: null }
  },
  status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' }
}, { timestamps: true });

const Match = mongoose.model('Match', matchSchema);
export default Match;
