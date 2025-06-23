// scripts/testCarRacingMatch.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5001/api/games';

// Player information
const PLAYER_1 = {
  id: '68552edb45158f86d2d91dbe',  // Replace with actual player ID
  name: 'Player 1'
};

const PLAYER_2 = {
  id: '68552fac45158f86d2d91dc2',  // Replace with actual player ID
  name: 'Player 2'
};

// Helper functions
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error ? error.message : '');
}

async function makeRequest(url, method, data = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: data ? JSON.stringify(data) : undefined
  };

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Request failed');
    }
    
    return responseData;
  } catch (error) {
    logError(`Request to ${url} failed:`, error);
    throw error;
  }
}

// Simulate a game session for a player
async function simulatePlayerGame(player, matchId) {
  try {
    log(`[${player.name}] Starting game session...`);
    
    // Start game session
    const sessionData = await makeRequest(
      `${API_BASE}/2d-car-racing/start`,
      'POST',
      { 
        playerId: player.id,
        matchId
      }
    );

    log(`[${player.name}] Game session started:`, sessionData.sessionId);

    // Simulate game play (random score between 1000-5000)
    const score = Math.floor(Math.random() * 4000) + 1000;
    const timePlayed = Math.floor(Math.random() * 60) + 30; // 30-90 seconds

    log(`[${player.name}] Game finished - Score: ${score}, Time: ${timePlayed}s`);

    // Submit score
    const result = await makeRequest(
      `${API_BASE}/2d-car-racing/submit-score`,
      'POST',
      {
        sessionId: sessionData.sessionId,
        playerId: player.id,
        score,
        matchId,
        timePlayed,
        gameData: {
          level: 1,
          carsCollected: Math.floor(score / 100),
          obstaclesHit: Math.floor(Math.random() * 5)
        }
      }
    );

    log(`[${player.name}] Score submitted:`, result);
    return { player, score, result };
  } catch (error) {
    logError(`[${player.name}] Error in game session:`, error);
    throw error;
  }
}

// Function to create a match for Car Racing
async function createCarRacingMatch(player1, player2) {
  try {
    log(`\n--- Creating match between ${player1.name} and ${player2.name} ---`);
    
    // Create a new match with player 1
    const createMatchResult = await makeRequest(
      `${API_BASE}/create-match`,
      'POST',
      {
        game: '2d-car-racing',
        entry_fee: 0,
        player1_id: player1.id,
        player1_name: player1.name
      }
    );

    const matchId = createMatchResult.match?.match_id || createMatchResult.match?._id;
    if (!matchId) {
      throw new Error('Failed to create match: No match ID in response');
    }
    
    log(`✅ Successfully created match with ID: ${matchId}`);

    // Add player 2 to the match
    log('\n--- Adding Player 2 to the match ---');
    await makeRequest(
      `${API_BASE}/submit-score`,
      'POST',
      {
        match_id: matchId,
        player_id: player2.id,
        player_name: player2.name,
        score: 0,
        game: '2d-car-racing'
      }
    );
    
    log(`✅ Successfully added ${player2.name} to the match`);
    return { matchId, ...createMatchResult };
  } catch (error) {
    logError('Error creating match:', error);
    throw error;
  }
}

// Main function to test the match
async function testCarRacingMatch() {
  try {
    log('🚗 Starting Car Racing match test...');

    // 1. Create a new match
    log('Creating new match...');
    const matchData = await createCarRacingMatch(PLAYER_1, PLAYER_2);
    const matchId = matchData.matchId;
    log('Match created successfully!');

    // 2. Simulate both players playing the game (one after another for better logging)
    log('\n--- Starting game sessions ---');
    const results = [];
    
    // Player 1 plays
    log(`\n🎮 ${PLAYER_1.name}'s turn to play...`);
    const player1Result = await simulatePlayerGame(PLAYER_1, matchId);
    results.push(player1Result);
    
    // Player 2 plays
    log(`\n🎮 ${PLAYER_2.name}'s turn to play...`);
    const player2Result = await simulatePlayerGame(PLAYER_2, matchId);
    results.push(player2Result);

    // 3. Determine the winner (highest score wins in racing)
    results.sort((a, b) => b.score - a.score);
    log('\n--- 🏁 Race Results 🏁 ---');
    results.forEach((result, index) => {
      const position = index === 0 ? '🥇' : index === 1 ? '🥈' : '🏅';
      log(`${position} ${result.player.name}: ${result.score} points`);
    });

    log(`\n🏁 ${results[0].player.name} wins the race with ${results[0].score} points!`);
    
    // Generate player URLs for the actual game
    const baseUrl = 'http://localhost:5001/games/2d-car-racing';
    log('\n--- Game URLs ---');
    log(`Player 1 (${PLAYER_1.name}): ${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_1.id}`);
    log(`Player 2 (${PLAYER_2.name}): ${baseUrl}/?match_id=${matchId}&player_id=${PLAYER_2.id}`);

  } catch (error) {
    logError('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCarRacingMatch();
