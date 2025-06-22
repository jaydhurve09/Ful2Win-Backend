// scripts/createMatch.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5001/api/games';

// Player information
const PLAYER_1 = {
  id: '68552edb45158f86d2d91dbe',
  name: 'Zoro'
};

const PLAYER_2 = {
  id: '68552fac45158f86d2d91dc2',
  name: 'Jon Snow'
};

// Helper function to log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Helper function to log errors with timestamp
function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error ? error.message : '');
}

async function makeRequest(url, method, data) {
  log(`Making ${method} request to ${url}`);
  log('Request data:', JSON.stringify(data, null, 2));
  
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
    log(`Response status: ${response.status} ${response.statusText}`);
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
      log('Response data:', JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      log('Raw response (not JSON):', responseText);
      throw new Error('Failed to parse JSON response');
    }
    
    if (!response.ok || (jsonResponse && !jsonResponse.success)) {
      const errorMsg = jsonResponse.error || `Request failed with status ${response.status}`;
      logError('Request failed', new Error(errorMsg));
      throw new Error(errorMsg);
    }
    
    return jsonResponse;
  } catch (error) {
    logError('Request failed', error);
    throw error;
  }
}

async function createMatch() {
  try {
    log('🚀 Starting match creation process...');
    
    // Step 1: Create a new match with player 1
    log('\n--- Step 1: Creating new match with Player 1 ---');
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
      throw new Error('Failed to create match: No match ID in response');
    }
    
    log(`✅ Successfully created match with ID: ${matchId}`);

    // Generate player URLs - using port 5001 to match the server
    const baseUrl = 'http://localhost:5001/games/Whack-A-Mole';
    const player1Url = `${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_1.id}`;
    const player2Url = `${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_2.id}`;

    // Step 2: Add player 2 to the match
    log('\n--- Step 2: Adding Player 2 to the match ---');
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
    
    log('✅ Successfully added Player 2 to the match');

    // Output the results in a clean format
    console.log('\n🎉 MATCH CREATION COMPLETE!');
    console.log('==========================');
    
    console.log('\n📋 Match Details:');
    console.log('----------------');
    console.log(`Match ID: ${matchId}`);
    console.log(`Game: Whack-A-Mole`);
    console.log(`Status: Active`);
    
    console.log('\n👥 Players:');
    console.log(`1. ${PLAYER_1.name} (ID: ${PLAYER_1.id})`);
    console.log(`2. ${PLAYER_2.name} (ID: ${PLAYER_2.id})`);
    
    console.log('\n🔗 Player URLs:');
    console.log(`Player 1 (${PLAYER_1.name}):`);
    console.log(`  ${player1Url}`);
    console.log(`\nPlayer 2 (${PLAYER_2.name}):`);
    console.log(`  ${player2Url}`);
    
    console.log('\n✅ Match created and players added successfully!');
    
  } catch (error) {
    logError('Failed to create match', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
log('Starting match creation script...');
createMatch();
