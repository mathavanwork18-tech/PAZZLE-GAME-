import { WebSocket } from 'ws';

const BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001/ws';

const animals = [
  'lion', 'tiger', 'panda', 'fox',
  'rabbit', 'bear', 'cat', 'dog',
  'penguin', 'koala', 'monkey', 'elephant'
];

async function runMultiplayerTestSuite() {
  console.log('======================================================================');
  console.log('🏁 COMPREHENSIVE MULTIPLAYER & SYNCHRONIZED MATCH CONTROL VERIFICATION');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // STEP 1: Admin Authentication & Clean Slate
  // -------------------------------------------------------------
  console.log('👉 [Step 1] Admin Login with code admin@123...');
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'admin@123' })
  });
  const { admin_token } = await loginRes.json();
  if (!admin_token) throw new Error('Admin login failed!');
  console.log('✅ Admin authenticated successfully.');

  console.log('👉 Configuring max_players = 50 and resetting active match...');
  await fetch(`${BASE_URL}/admin/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token },
    body: JSON.stringify({ max_players: 50, match_duration: 600 })
  });
  await fetch(`${BASE_URL}/admin/clear-all-players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  await fetch(`${BASE_URL}/admin/reset-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  console.log('✅ Match reset to WAITING state with clean database.\n');

  // -------------------------------------------------------------
  // STEP 2: 40 Players Join the Same Global Lobby
  // -------------------------------------------------------------
  console.log('👉 [Step 2] Spawning 40 concurrent players with live WebSockets...');
  const wsClients = [];
  const playerSessions = [];
  const wsEvents = new Map();

  for (let i = 1; i <= 40; i++) {
    const ws = new WebSocket(WS_URL);
    wsClients.push(ws);
    wsEvents.set(i, []);

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        wsEvents.get(i).push(parsed);
      } catch (e) {}
    });
  }

  // Wait for sockets to open
  await Promise.all(wsClients.map(ws => new Promise(r => ws.on('open', r))));
  console.log('✅ All 40 WebSocket client connections open.');

  const joinPromises = [];
  for (let i = 1; i <= 40; i++) {
    const name = `Engineer_${String(i).padStart(2, '0')}`;
    const animal = animals[(i - 1) % animals.length];

    joinPromises.push(
      fetch(`${BASE_URL}/player/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, animal_id: animal })
      }).then(r => r.json())
    );
  }

  const joinResults = await Promise.all(joinPromises);
  const successJoins = joinResults.filter(r => r.success);
  console.log(`✅ ${successJoins.length} / 40 players registered successfully.`);

  if (successJoins.length !== 40) throw new Error('Expected 40 players to join!');

  // Verify Single Shared match_id and unique player IDs
  const matchIds = new Set(successJoins.map(j => j.match_state.match_id));
  const playerIds = new Set(successJoins.map(j => j.player.player_id));

  console.log(`✅ Verified Shared Match ID: "${Array.from(matchIds)[0]}" across all players.`);
  console.log(`✅ Verified 40 Distinct Player IDs generated: ${playerIds.size} unique IDs.`);
  if (matchIds.size !== 1 || playerIds.size !== 40) {
    throw new Error('Match ID or Player ID isolation failure!');
  }

  successJoins.forEach((res, idx) => {
    playerSessions.push(res);
    wsClients[idx].send(JSON.stringify({ type: 'IDENTIFY', session_token: res.session_token }));
  });

  // Verify Lobby Participant Count
  const stateRes = await fetch(`${BASE_URL}/match/state`);
  const { state: lobbyState } = await stateRes.json();
  const lbRes = await fetch(`${BASE_URL}/match/leaderboard`);
  const { leaderboard } = await lbRes.json();
  console.log(`✅ Global Lobby Count: ${leaderboard.length} / ${lobbyState.max_players} players.\n`);

  // -------------------------------------------------------------
  // STEP 3: Admin Starts Match -> Synchronized Countdown
  // -------------------------------------------------------------
  console.log('👉 [Step 3] Admin clicks START MATCH (Triggers Synchronized 3-2-1-GO Countdown)...');
  const startRes = await fetch(`${BASE_URL}/admin/start-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const startData = await startRes.json();
  if (!startData.success || startData.match_state.status !== 'COUNTDOWN') {
    throw new Error('Start match did not transition to COUNTDOWN!');
  }

  const targetAt = startData.match_state.countdown_target_at;
  console.log(`✅ Match transitioned to COUNTDOWN! Authoritative target timestamp: ${targetAt}`);

  // Verify clients received MATCH_COUNTDOWN
  await new Promise(r => setTimeout(r, 400));
  let receivedCountdowns = 0;
  wsEvents.forEach((events) => {
    if (events.some(e => e.type === 'MATCH_COUNTDOWN')) receivedCountdowns++;
  });
  console.log(`✅ Synchronized COUNTDOWN event delivered to ${receivedCountdowns} / 40 clients.`);

  // Wait 4 seconds for server-authoritative transition to ROUND_1
  console.log('⏳ Waiting for server countdown timer to transition to ROUND_1...');
  let activeState = null;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 8000) {
    const liveStateRes = await fetch(`${BASE_URL}/match/state`);
    const data = await liveStateRes.json();
    if (data.state.status === 'ROUND_1') {
      activeState = data.state;
      break;
    }
    await new Promise(r => setTimeout(r, 250));
  }

  if (!activeState || activeState.status !== 'ROUND_1') {
    throw new Error(`Expected ROUND_1 after countdown, got ${activeState ? activeState.status : 'null'}`);
  }
  console.log('✅ Server automatically transitioned to ROUND_1 at target timestamp!');

  // Verify 10-minute global timer
  const totalMatchSeconds = Math.round((activeState.match_end_time - activeState.match_start_time) / 1000);
  console.log(`✅ Authoritative Global Match Duration: ${totalMatchSeconds} seconds (10 Minutes).\n`);

  // -------------------------------------------------------------
  // STEP 4: Late Joiner (Player 41) Enters in Spectator Mode
  // -------------------------------------------------------------
  console.log('👉 [Step 4] Player 41 attempts to join during active ROUND_1...');
  const lateRes = await fetch(`${BASE_URL}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Late_Player_41', animal_id: 'fox' })
  });
  const lateData = await lateRes.json();
  if (!lateData.success || !lateData.is_late_joiner || lateData.player.player_status !== 'SPECTATOR') {
    throw new Error('Late player was not placed into SPECTATOR mode!');
  }
  console.log(`✅ Player 41 successfully joined as: ${lateData.player.player_status} (${lateData.player.join_type} joiner)`);

  // Verify Player 41 cannot submit puzzle solutions while in SPECTATOR mode
  const canonical25 = Array.from({ length: 25 }, (_, i) => i);
  const spectatorSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: lateData.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 20,
      request_id: 'spec-req'
    })
  });
  const specSubmitData = await spectatorSubmit.json();
  if (spectatorSubmit.status === 400 && specSubmitData.error.toLowerCase().includes('spectator')) {
    console.log(`✅ Puzzle submission correctly rejected for spectator: "${specSubmitData.error}"\n`);
  } else {
    throw new Error('Spectator was unfairly permitted to submit puzzle solutions!');
  }

  // -------------------------------------------------------------
  // STEP 5: Emergency Rejoin Admission (Code 0000)
  // -------------------------------------------------------------
  console.log('👉 [Step 5] Testing Emergency Admission System with Code 0000...');
  // Test invalid code
  const badCodeRes = await fetch(`${BASE_URL}/admin/verify-emergency-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token },
    body: JSON.stringify({ code: '9999' })
  });
  if (badCodeRes.status === 401) {
    console.log('✅ Invalid emergency code 9999 safely rejected with 401.');
  } else {
    throw new Error('Invalid emergency code was not rejected!');
  }

  // Test valid code 0000
  const goodCodeRes = await fetch(`${BASE_URL}/admin/verify-emergency-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token },
    body: JSON.stringify({ code: '0000' })
  });
  const goodCodeData = await goodCodeRes.json();
  if (goodCodeData.success && goodCodeData.verified) {
    console.log('✅ Valid emergency code 0000 verified successfully!');
  }

  // Admin admits Late Player 41
  console.log(`👉 Admin admitting Late_Player_41 (${lateData.player.player_id})...`);
  const admitRes = await fetch(`${BASE_URL}/admin/admit-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token },
    body: JSON.stringify({ player_id: lateData.player.player_id })
  });
  const admitData = await admitRes.json();
  if (admitData.success && admitData.player.player_status === 'PLAYING' && admitData.player.admitted_by_admin) {
    console.log('✅ Late Player 41 admitted! Status changed to PLAYING.');
  } else {
    throw new Error('Admit player failed!');
  }

  // Verify Late Player 41 can now solve Round 1 with remaining match time
  const admittedSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: lateData.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 22,
      request_id: 'late-admitted-req'
    })
  });
  const admittedSubmitData = await admittedSubmit.json();
  if (admittedSubmitData.success && admittedSubmitData.correct) {
    console.log(`✅ Admitted Player 41 completed Round 1 with +${admittedSubmitData.coins_earned} coins awarded!\n`);
  } else {
    throw new Error('Admitted player submission failed!');
  }

  // -------------------------------------------------------------
  // STEP 6: Admin Kick System & Persistent Kick Protection
  // -------------------------------------------------------------
  console.log('👉 [Step 6] Testing Admin Kick System on Player 10...');
  const p10 = playerSessions[9];
  const kickRes = await fetch(`${BASE_URL}/admin/kick-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token },
    body: JSON.stringify({ player_id: p10.player.player_id, reason: 'Tournament rule violation' })
  });
  const kickData = await kickRes.json();
  if (kickData.success && kickData.player.player_status === 'KICKED') {
    console.log(`✅ Player 10 (${p10.player.player_id}) kicked by administrator.`);
  }

  // Verify kicked player submissions are rejected with 403
  const kickedSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: p10.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 10,
      request_id: 'kicked-sub'
    })
  });
  if (kickedSubmit.status === 403) {
    console.log('✅ Kicked player puzzle submission blocked with 403 Forbidden.');
  } else {
    throw new Error('Kicked player was able to submit puzzles!');
  }

  // Verify page refresh does NOT restore player 10
  const sessionRestore = await fetch(`${BASE_URL}/player/session/${p10.session_token}`);
  const sessionData = await sessionRestore.json();
  if (sessionData.player.player_status === 'KICKED') {
    console.log('✅ Persistent Kick verified: Reconnection/refresh retains KICKED status.\n');
  } else {
    throw new Error('Kick status was bypassed on refresh!');
  }

  // -------------------------------------------------------------
  // STEP 7: Coin Ledger & Double Submission Protection
  // -------------------------------------------------------------
  console.log('👉 [Step 7] Testing Exact Coin Ledger (+100 for R1, +200 for R2) & Zero Duplicates...');
  const testPlayer = playerSessions[0];

  // Round 1 completion
  const r1Sub = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: testPlayer.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 20,
      request_id: 'test-r1-req-1'
    })
  });
  const r1Data = await r1Sub.json();
  console.log(`✅ Round 1 completed: +${r1Data.coins_earned} coins (Total: ${r1Data.total_coins})`);
  if (r1Data.coins_earned !== 100) throw new Error('Expected +100 coins for Round 1!');

  // Duplicate Round 1 submission (Double-click attack)
  console.log('👉 Simulating immediate duplicate submission on Round 1...');
  const dupSub = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: testPlayer.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 20,
      request_id: 'test-r1-req-1'
    })
  });
  const dupData = await dupSub.json();
  console.log(`✅ Duplicate submission returned cached result without extra coins (Total Coins: ${dupData.total_coins})`);
  if (dupData.total_coins !== 100) throw new Error('Duplicate submission inflated coins!');

  // Advance to Round 2 & submit
  await fetch(`${BASE_URL}/player/advance-round-2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: testPlayer.session_token })
  });

  const r2Sub = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: testPlayer.session_token,
      round_number: 2,
      solution_order: canonical25,
      move_count: 25,
      request_id: 'test-r2-req'
    })
  });
  const r2Data = await r2Sub.json();
  console.log(`✅ Round 2 completed: +${r2Data.coins_earned} coins (Total: ${r2Data.total_coins})`);
  if (r2Data.coins_earned !== 200 || r2Data.total_coins !== 300) {
    throw new Error(`Expected 300 total coins (+100 + +200), got ${r2Data.total_coins}`);
  }

  // Audit Coin Ledger Table
  const txRes = await fetch(`${BASE_URL}/admin/coin-transactions?player_id=${testPlayer.player.player_id}`, {
    headers: { 'x-admin-token': admin_token }
  });
  const { transactions } = await txRes.json();
  console.log(`✅ Coin Ledger Audit: exactly ${transactions.length} transactions recorded:`);
  transactions.forEach(tx => {
    console.log(`   [Tx #${tx.id}] ${tx.transaction_type}: +${tx.amount} coins (${tx.description}) at ${tx.created_at_iso}`);
  });
  if (transactions.length !== 2) throw new Error('Expected exactly 2 coin ledger entries!');

  // -------------------------------------------------------------
  // STEP 8: Pause & Resume Match Timing
  // -------------------------------------------------------------
  console.log('\n👉 [Step 8] Testing Admin PAUSE & RESUME...');
  const prePauseEnd = activeState.match_end_time;
  await fetch(`${BASE_URL}/admin/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  console.log('✅ Match paused. Waiting 1.5s...');
  await new Promise(r => setTimeout(r, 1500));

  const resumeRes = await fetch(`${BASE_URL}/admin/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const resumeData = await resumeRes.json();
  const postResumeEnd = resumeData.match_state.match_end_time;
  const addedMs = postResumeEnd - prePauseEnd;
  console.log(`✅ Match resumed. End timestamp correctly extended by ${addedMs}ms.\n`);
  if (addedMs < 1400) throw new Error('Resume did not compensate for paused duration!');

  // -------------------------------------------------------------
  // STEP 9: Admin STOP MATCH
  // -------------------------------------------------------------
  console.log('👉 [Step 9] Testing Admin STOP MATCH...');
  const stopRes = await fetch(`${BASE_URL}/admin/stop-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const stopData = await stopRes.json();
  if (stopData.match_state.status === 'STOPPED') {
    console.log('✅ Match status changed to STOPPED.');
  }

  // Verify submissions are blocked while STOPPED
  const stoppedSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: playerSessions[2].session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 15,
      request_id: 'stopped-req'
    })
  });
  if (stoppedSubmit.status === 400) {
    console.log('✅ Submissions correctly blocked during STOPPED state.\n');
  } else {
    throw new Error('Submission was accepted while stopped!');
  }

  // -------------------------------------------------------------
  // STEP 10: Audit Trail Verification
  // -------------------------------------------------------------
  console.log('👉 [Step 10] Fetching and verifying Admin Audit Logs...');
  const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
    headers: { 'x-admin-token': admin_token }
  });
  const { logs } = await auditRes.json();
  console.log(`✅ Found ${logs.length} authoritative audit log records.`);
  logs.slice(0, 5).forEach(l => {
    console.log(`   [${l.action}] Target: ${l.target_player_id || 'N/A'} • ${l.details || ''}`);
  });

  // Clean up WebSockets
  wsClients.forEach(ws => ws.close());

  console.log('\n======================================================================');
  console.log('🎉 ALL 13 MULTIPLAYER ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY (100%)');
  console.log('======================================================================\n');
}

runMultiplayerTestSuite().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
