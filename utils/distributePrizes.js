// utils/distributePrizes.js
import Score from '../models/Score.js';
import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import AdminWallet from '../models/adminWallet.js';

export const distributePrizes = async (tournamentId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament || tournament.status !== 'completed' || tournament.prizeDistributed) {
      console.log('Tournament not eligible for prize distribution');
      return;
    }

    // Get top 3 scorers by score DESC
    const topScorers = await Score.find({ roomId: tournamentId })
      .sort({ score: -1 })
      .limit(3);

    if (topScorers.length === 0) {
      console.log('No scores found for tournament:', tournamentId);
      return;
    }

    const totalPrize = tournament.CollectPrize;
    const prizeShares = [0.5, 0.2, 0.1]; // 80% distributed
    let distributedAmount = 0;

    const updates = [];

    for (let i = 0; i < topScorers.length; i++) {
      const scorer = topScorers[i];
      const user = await User.findById(scorer.userId);
      const prizeAmount = Math.floor(totalPrize * prizeShares[i]);

      if (!user) continue;
      console.log("userfound");
      if(tournament.tournamentType === 'coin') {
        user.coins = (user.coins || 0) + prizeAmount;
      } else if(tournament.tournamentType === 'cash') {
        user.balance = (user.balance || 0) + prizeAmount;
      }
      updates.push(user.save());

      distributedAmount += prizeAmount;
    }

    // Calculate leftover (20%) to admin
    const leftover = totalPrize - distributedAmount;

    // Update admin wallet
    let adminWallet = await AdminWallet.findOne();
    if (!adminWallet) {
      adminWallet = new AdminWallet();
    }

    if(tournament.tournamentType === 'coin') {
      adminWallet.coin = (adminWallet.coin || 0) + leftover;
    } else if(tournament.tournamentType === 'cash') {
      adminWallet.balance = (adminWallet.balance || 0) + leftover;
    }
    await adminWallet.save();

    // Mark tournament as prize distributed
    tournament.prizeDistributed = true;
    await tournament.save();

    // Wait for all user updates
    await Promise.all(updates);

    console.log('Prizes distributed. Admin received leftover:', leftover);
  } catch (error) {
    console.error('Prize distribution failed:', error);
  }
};
