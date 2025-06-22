import fetch from 'node-fetch';

async function testServer() {
  const url = 'http://localhost:5001/health';
  
  try {
    console.log(`Testing server at ${url}...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log('Server response:', data);
  } catch (error) {
    console.error('Failed to connect to server:');
    console.error('Error:', error.message);
    console.log('\nPossible issues:');
    console.log('1. The server might not be running');
    console.log('2. The server might be running on a different port');
    console.log('3. There might be a firewall blocking the connection');
  }
}

testServer();
