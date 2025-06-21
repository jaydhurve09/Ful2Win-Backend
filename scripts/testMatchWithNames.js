// scripts/testMatchWithNames.js
import fetch from 'node-fetch';

// Test player data
const PLAYER_1 = {
  id: '68552edb45158f86d2d91dbe',
  name: 'Player One'
};

const PLAYER_2 = {
  id: '68552fac45158f86d2d91dc2',
  name: 'Player Two'
};

async function createMatch() {
  console.log('Creating new match...');
  
  try {
    // 1. Create a new match with Player 1
    const createRes = await fetch('http://localhost:5000/api/games/create-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: 'whackamole',
        entry_fee: 0,
        player1_id: PLAYER_1.id,
        player1_name: PLAYER_1.name
      })
    });
    
    const matchData = await createRes.json();
    
    if (!matchData.success || !matchData.match) {
      throw new Error('Failed to create match: ' + JSON.stringify(matchData));
    }
    
    const matchId = matchData.match.match_id;
    console.log('\n=== MATCH CREATED SUCCESSFULLY ===');
    console.log('Match ID:', matchId);
    
    // 2. Add Player 2 to the match by submitting an initial score
    console.log('\nAdding Player 2 to the match...');
    const addPlayerRes = await fetch('http://localhost:5000/api/games/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        player_id: PLAYER_2.id,
        player_name: PLAYER_2.name,
        score: 0,  // Initial score
        game: 'whackamole'
      })
    });
    
    const addPlayerData = await addPlayerRes.json();
    console.log('Player 2 added to match:', addPlayerData.success);
    
    // 3. Generate game URLs
    const baseUrl = 'http://localhost:5000/games/Whack-A-Mole';
    
    console.log('\n=== GAME URLS ===');
    console.log(`\nPlayer 1 (${PLAYER_1.name}):`);
    console.log(`${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_1.id}&player_name=${encodeURIComponent(PLAYER_1.name)}`);
    
    console.log(`\nPlayer 2 (${PLAYER_2.name}):`);
    console.log(`${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_2.id}&player_name=${encodeURIComponent(PLAYER_2.name)}`);
    
    console.log('\nMatch is ready! Players can now join using the URLs above.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
createMatch();
