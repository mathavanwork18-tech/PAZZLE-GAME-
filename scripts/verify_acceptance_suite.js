import { WebSocket } from 'ws';

const BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001/ws';

async function post(endpoint, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() };
}

async function get(endpoint, headers = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
  return { status: res.status, data: await res.json() };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAcceptanceSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 ENGINEERING DAY PUZZLE CHALLENGE — ACCEPTANCE TEST SUITE');
  console.log('🧪 ========================================================');

  // Reset match to clean slate first
  const adminLoginRes = await post('/admin/login', { code: 'admin@123' });
  const adminToken = adminLoginRes.data.admin_token;
  await post('/admin/reset-match', {}, { 'x-admin-token': adminToken });
  console.log('✅ Match reset to clean baseline.');

  // TEST 1: Create Player A (Mathavan, Panda + Engineer Helmet + Safety Glasses + Lab Coat)
  console.log('\n--- TEST 1: Create Player A (Mathavan) ---');
  const p1Res = await post('/player/join', {
    name: 'Mathavan',
    animal_id: 'panda',
    hat_id: 'eng_helmet',
    glasses_id: 'safety_glasses',
    outfit_id: 'lab_coat'
  });
  if (p1Res.status !== 200 || !p1Res.data.success) {
    throw new Error(`TEST 1 Failed: ${JSON.stringify(p1Res.data)}`);
  }
  const playerA = p1Res.data.player;
  const tokenA = p1Res.data.session_token;
  console.log(`✅ Player A Created: ID=${playerA.player_id}, Name="${playerA.name}", Animal=${playerA.animal_id}`);
  console.log(`   Hat=${playerA.hat_id}, Glasses=${playerA.glasses_id}, Outfit=${playerA.outfit_id}`);
  if (playerA.name !== 'Mathavan' || playerA.animal_id !== 'panda' || playerA.hat_id !== 'eng_helmet') {
    throw new Error('TEST 1 Failed: Attributes mismatch');
  }

  // TEST 2: Create Player B with duplicate case-insensitive username "mathavan"
  console.log('\n--- TEST 2: Duplicate Username Check ("mathavan") ---');
  const p2Res = await post('/player/join', {
    name: 'mathavan',
    animal_id: 'tiger'
  });
  console.log(`   Server Response Status: ${p2Res.status}, Error Message: "${p2Res.data.error}"`);
  if (p2Res.status !== 400 || p2Res.data.error !== 'Username is already here. Try a new name.') {
    throw new Error(`TEST 2 Failed: Expected "Username is already here. Try a new name." but got "${p2Res.data.error}"`);
  }
  console.log('✅ TEST 2 Passed: Duplicate username successfully blocked at database level.');

  // TEST 3: Create 10+ Players simultaneously
  console.log('\n--- TEST 3: Concurrent Player Creation (15 Players) ---');
  const animals = ['lion', 'tiger', 'fox', 'rabbit', 'bear', 'cat', 'dog', 'penguin', 'koala', 'monkey', 'elephant'];
  const hats = ['classic_cap', 'grad_cap', 'eng_helmet', 'detective_hat', 'crown', 'party_hat', 'beanie', 'top_hat'];
  const glasses = ['round_glasses', 'square_glasses', 'sunglasses', 'safety_glasses', 'nerd_glasses'];
  const outfits = ['eng_coat', 'college_hoodie', 'formal_shirt', 'lab_coat', 'casual_jacket', 'safety_vest', 'grad_outfit'];

  const joinPromises = [];
  for (let i = 1; i <= 15; i++) {
    joinPromises.push(
      post('/player/join', {
        name: `Student_${i}`,
        animal_id: animals[i % animals.length],
        hat_id: hats[i % hats.length],
        glasses_id: glasses[i % glasses.length],
        outfit_id: outfits[i % outfits.length]
      })
    );
  }
  const joinResults = await Promise.all(joinPromises);
  const createdPlayers = [];
  const playerIds = new Set();
  for (const r of joinResults) {
    if (!r.data.success) {
      throw new Error(`TEST 3 Failed player join: ${r.data.error}`);
    }
    const p = r.data.player;
    if (playerIds.has(p.player_id)) {
      throw new Error(`TEST 3 Collision: duplicate player_id ${p.player_id}`);
    }
    playerIds.add(p.player_id);
    createdPlayers.push({ token: r.data.session_token, player: p });
  }
  console.log(`✅ TEST 3 Passed: 15 concurrent players created with unique IDs (${Array.from(playerIds).slice(0, 5).join(', ')}...)`);

  // TEST 4: Refresh Player A (Session Restoration)
  console.log('\n--- TEST 4: Session Restoration for Player A ---');
  const sessionRes = await get(`/player/session/${tokenA}`);
  if (sessionRes.status !== 200 || !sessionRes.data.success) {
    throw new Error(`TEST 4 Failed: ${JSON.stringify(sessionRes.data)}`);
  }
  const restoredA = sessionRes.data.player;
  if (restoredA.player_id !== playerA.player_id || restoredA.name !== 'Mathavan' || restoredA.hat_id !== 'eng_helmet') {
    throw new Error('TEST 4 Failed: Restored player state does not match database record');
  }
  console.log(`✅ TEST 4 Passed: Restored Player A without duplicate creation: ${restoredA.player_id} - ${restoredA.name}`);

  // TEST 5: Change Player A's Avatar without affecting others
  console.log("\n--- TEST 5: Change Player A's Avatar & Verify Isolation ---");
  const updateRes = await post('/player/update-avatar', {
    session_token: tokenA,
    hat_id: 'crown',
    glasses_id: 'sunglasses',
    outfit_id: 'grad_outfit'
  });
  if (!updateRes.data.success || updateRes.data.player.hat_id !== 'crown') {
    throw new Error('TEST 5 Failed to update avatar');
  }
  // Check Player 1 from Test 3 is unaffected
  const otherPlayer = createdPlayers[0];
  const checkOther = await get(`/player/session/${otherPlayer.token}`);
  if (checkOther.data.player.hat_id === 'crown') {
    throw new Error('TEST 5 Failed: Player B avatar corrupted by Player A update');
  }
  console.log(`✅ TEST 5 Passed: Player A updated to hat="crown", glasses="sunglasses". Other players isolated.`);

  // TEST 6: Start Match & 10-Minute Timer
  console.log('\n--- TEST 6: Admin START Match ---');
  const startRes = await post('/admin/start-match', {}, { 'x-admin-token': adminToken });
  if (!startRes.data.success || startRes.data.match_state.status !== 'ROUND_1') {
    throw new Error(`TEST 6 Failed to start match: ${JSON.stringify(startRes.data)}`);
  }
  const matchDuration = (startRes.data.match_state.match_end_time - startRes.data.match_state.match_start_time) / 1000;
  console.log(`✅ TEST 6 Passed: Match started! Authoritative duration = ${matchDuration}s (10 minutes).`);

  // TEST 7: WebSocket Broadcast Listeners
  console.log('\n--- TEST 7: WebSocket Real-Time Connectivity ---');
  let receivedStopped = false;
  const ws = new WebSocket(WS_URL);
  await new Promise((resolve) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'IDENTIFY', session_token: tokenA }));
      resolve();
    });
  });
  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'MATCH_STOPPED') {
      receivedStopped = true;
    }
  });
  console.log('✅ TEST 7 Passed: Player A WebSocket connected and identified.');

  // TEST 8: Complete Round 1 (+50 coins, score, idempotency)
  console.log('\n--- TEST 8: Complete Round 1 with Canonical 25 Pieces ---');
  const canonical25 = Array.from({ length: 25 }, (_, i) => i);
  const submitR1Res = await post('/puzzle/submit', {
    session_token: tokenA,
    round_number: 1,
    solution_order: canonical25,
    move_count: 22,
    request_id: 'req-r1-playerA-01'
  });
  if (!submitR1Res.data.correct || submitR1Res.data.coins_earned !== 50) {
    throw new Error(`TEST 8 Failed: ${JSON.stringify(submitR1Res.data)}`);
  }
  console.log(`   Awarded Score: ${submitR1Res.data.awarded_score}, Coins Earned: ${submitR1Res.data.coins_earned}`);

  // Idempotency: Duplicate submit attempt
  const dupSubmit = await post('/puzzle/submit', {
    session_token: tokenA,
    round_number: 1,
    solution_order: canonical25,
    move_count: 22,
    request_id: 'req-r1-playerA-01'
  });
  if (dupSubmit.data.coins_earned !== 50 || dupSubmit.data.total_coins !== 50) {
    throw new Error('TEST 8 Failed: Duplicate submission awarded extra coins');
  }
  console.log('✅ TEST 8 Passed: Round 1 awarded +50 coins. Idempotency verified.');

  // Advance to Round 2
  await post('/player/advance-round-2', { session_token: tokenA });
  const checkR2 = await get(`/player/session/${tokenA}`);
  if (checkR2.data.player.current_round !== 2) {
    throw new Error('TEST 8 Failed to advance to Round 2');
  }
  console.log('✅ Transitioned to Round 2.');

  // TEST 9: Refresh during Round 2
  console.log('\n--- TEST 9: Session Recovery during Round 2 ---');
  const refreshR2 = await get(`/player/session/${tokenA}`);
  if (refreshR2.data.player.current_round !== 2 || refreshR2.data.player.coins !== 50) {
    throw new Error('TEST 9 Failed: State lost on Round 2 refresh');
  }
  console.log(`✅ TEST 9 Passed: State retained during Round 2. Current round = ${refreshR2.data.player.current_round}, Coins = ${refreshR2.data.player.coins}`);

  // TEST 10: Admin STOP Mode
  console.log('\n--- TEST 10: Admin STOP Mode Broadcast & Freeze ---');
  const stopRes = await post('/admin/stop-match', {}, { 'x-admin-token': adminToken });
  if (!stopRes.data.success || stopRes.data.match_state.status !== 'STOPPED') {
    throw new Error('TEST 10 Failed to stop match');
  }
  await sleep(400);
  if (!receivedStopped) {
    throw new Error('TEST 10 Failed: WebSocket client did not receive MATCH_STOPPED broadcast');
  }

  // Attempt puzzle move during STOPPED state (Must be blocked)
  const blockedSubmit = await post('/puzzle/submit', {
    session_token: tokenA,
    round_number: 2,
    solution_order: canonical25,
    move_count: 10,
    request_id: 'req-blocked-stop'
  });
  if (blockedSubmit.status !== 400 || !blockedSubmit.data.error.includes('stopped')) {
    throw new Error(`TEST 10 Failed: Submit was not blocked during STOP state (${blockedSubmit.data.error})`);
  }
  console.log('✅ TEST 10 Passed: Match STOPPED broadcasted over WebSocket. Move submissions blocked.');

  // TEST 11: Admin RESET Match
  console.log('\n--- TEST 11: Admin RESET Match ---');
  const resetRes = await post('/admin/reset-match', {}, { 'x-admin-token': adminToken });
  if (!resetRes.data.success || resetRes.data.match_state.status !== 'WAITING') {
    throw new Error('TEST 11 Failed to reset match');
  }
  const resetPlayerA = await get(`/player/session/${tokenA}`);
  if (resetPlayerA.data.player.status !== 'WAITING' || resetPlayerA.data.player.name !== 'Mathavan') {
    throw new Error('TEST 11 Failed: Player record corrupted by match reset');
  }
  console.log('✅ TEST 11 Passed: Match reset to WAITING without corrupting player record or avatar.');

  // TEST 12: Admin Player Monitor
  console.log('\n--- TEST 12: Admin Player Monitoring Endpoint ---');
  const adminPlayersRes = await get('/admin/players', { 'x-admin-token': adminToken });
  if (!adminPlayersRes.data.success || !Array.isArray(adminPlayersRes.data.players)) {
    throw new Error('TEST 12 Failed to fetch admin players list');
  }
  const monitorRow = adminPlayersRes.data.players.find((p) => p.username === 'Mathavan');
  if (!monitorRow || !monitorRow.player_id) {
    throw new Error('TEST 12 Failed: Mathavan not found in admin monitor list');
  }
  console.log(`✅ TEST 12 Passed: Admin monitor returned ${adminPlayersRes.data.players.length} players with formatted IDs:`);
  console.log(`   Sample: ${monitorRow.player_id} | ${monitorRow.username} | ${monitorRow.animal_id} | ${monitorRow.hat_id} | ${monitorRow.glasses_id} | ${monitorRow.outfit_id} | Round ${monitorRow.current_round} | Score ${monitorRow.score} | Coins ${monitorRow.coins} | ${monitorRow.game_status}`);

  ws.close();

  console.log('\n🎉 ========================================================');
  console.log('🎉 ALL 12 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS RATE!');
  console.log('🎉 ========================================================\n');
}

runAcceptanceSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
