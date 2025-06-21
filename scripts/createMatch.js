// scripts/createMatch.js
import fetch from 'node-fetch';

const PLAYER_1_ID = '68552edb45158f86d2d91dbe';
const PLAYER_2_ID = '68552fac45158f86d2d91dc2';

async function createMatch() {
  try {
    const requestBody = {
      game: 'whackamole',
      entry_fee: 0,
      player1_id: PLAYER_1_ID
    };

    console.log('Sending request to create match with body:', JSON.stringify(requestBody, null, 2));
    
    // First, create the match with player 1
    const createRes = await fetch('http://localhost:5000/api/games/create-match', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await createRes.text();
    console.log('Raw response:', responseText);
    
    let matchData;
    try {
      matchData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    if (!matchData.success || !matchData.match) {
      throw new Error('Failed to create match: ' + JSON.stringify(matchData));
    }

    const matchId = matchData.match.match_id;
    console.log('\n=== MATCH CREATED SUCCESSFULLY ===');
    console.log('Match ID:', matchId);

    // Generate player URLs
    const baseUrl = 'http://localhost:5000/games/Whack-A-Mole';
    const player1Url = `${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_1_ID}`;
    const player2Url = `${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_2_ID}`;

    console.log('\n=== PLAYER 1 ===');
    console.log(player1Url);
    console.log('\n=== PLAYER 2 ===');
    console.log(player2Url);

    // Add player 2 to the match by submitting a score
    const addPlayerRes = await fetch('http://localhost:5000/api/games/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        player_id: PLAYER_2_ID,
        score: 0,  // Initial score of 0
        game: 'whackamole'
      })
    });

    const addPlayerData = await addPlayerRes.json();
    console.log('\nPlayer 2 added to match:', addPlayerData.success);

    console.log('\nMatch is ready! Players can now join using the URLs above.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createMatch();
