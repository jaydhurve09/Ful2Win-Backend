// scripts/testCreateMatch.js
import fetch from 'node-fetch';

async function testCreateMatch() {
  const url = 'http://localhost:5000/api/games/create-match';
  const body = {
    game: 'whackamole',
    entry_fee: 0,
    player1_id: '68552edb45158f86d2d91dbe'
  };

  console.log('Sending POST request to:', url);
  console.log('Request body:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log('Status:', response.status);
    console.log('Response headers:', JSON.stringify([...response.headers.entries()], null, 2));
    console.log('Response body:', responseText);

    try {
      const json = JSON.parse(responseText);
      console.log('Parsed JSON:', json);
    } catch (e) {
      console.log('Response is not valid JSON');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testCreateMatch();
