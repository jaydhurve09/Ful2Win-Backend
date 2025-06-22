import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/games';

// Player information
const PLAYER_1 = {
  id: '68552edb45158f86d2d91dbe',
  name: 'Zoro'
};

const PLAYER_2 = {
  id: '68552fac45158f86d2d91dc2',
  name: 'Jon Snow'
};

async function makeRequest(url, method, data) {
  console.log(`\n=== ${method} ${url} ===`);
  console.log('Request:', JSON.stringify(data, null, 2));
  
  try {
    const response = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    console.log('Status:', response.status, response.statusText);
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON response:', responseText);
      throw e;
    }
    
    console.log('Response:', JSON.stringify(jsonResponse, null, 2));
    
    if (!response.ok || (jsonResponse && !jsonResponse.success)) {
      throw new Error(jsonResponse.error || `Request failed with status ${response.status}`);
    }
    
    return jsonResponse;
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

async function testMatchFlow() {
  try {
    // Step 1: Create a new match with player 1
    console.log('\n--- Creating new match ---');
    const createMatchResult = await makeRequest(
      `${API_BASE}/create-match`,
      'POST',
      {
        game: 'whackamole',
        entry_fee: 0,
        player1_id: PLAYER_1.id,
        player1_name: PLAYER_1.name
      }
    );

    const matchId = createMatchResult.match?.match_id;
    if (!matchId) {
      throw new Error('No match_id in response');
    }

    console.log(`✅ Match created with ID: ${matchId}`);

    // Step 2: Add player 2 to the match
    console.log('\n--- Adding player 2 to match ---');
    await makeRequest(
      `${API_BASE}/submit-score`,
      'POST',
      {
        match_id: matchId,
        player_id: PLAYER_2.id,
        player_name: PLAYER_2.name,
        score: 0,
        game: 'whackamole'
      }
    );

    console.log('\n✅ Test completed successfully!');
    console.log('Match ID:', matchId);
    console.log('Player 1:', PLAYER_1.name, `(ID: ${PLAYER_1.id})`);
    console.log('Player 2:', PLAYER_2.name, `(ID: ${PLAYER_2.id})`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMatchFlow();
