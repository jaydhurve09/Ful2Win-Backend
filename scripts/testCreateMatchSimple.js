// scripts/testCreateMatchSimple.js
import fetch from 'node-fetch';

async function testCreateMatch() {
  const url = 'http://localhost:5000/api/games/create-match';
  const body = {
    game: 'whackamole',
    entry_fee: 0,
    player1_id: '68552edb45158f86d2d91dbe'
  };

  console.log('Testing match creation...');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (data.success && data.match) {
      console.log('\nMatch created successfully!');
      console.log('Match ID:', data.match.match_id);
      console.log('Player 1 URL:', `http://localhost:5000/games/Whack-A-Mole/?match_id=${data.match.match_id}&player_id=68552edb45158f86d2d91dbe`);
      console.log('Player 2 URL:', `http://localhost:5000/games/Whack-A-Mole/?match_id=${data.match.match_id}&player_id=68552fac45158f86d2d91dc2`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreateMatch();
