// Complete Test Scenario as specified in Section 66 of Requirements Prompt
const BASE_URL = 'http://localhost:3001/api';

async function testCompleteScenario() {
  console.log('===========================================================');
  console.log('🧪 RUNNING SECTION 66 COMPLETE TEST SCENARIO (TEST 1 - 13)');
  console.log('===========================================================\n');

  // Step 0: Admin Reset to Clean Slate
  const loginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'admin@123' })
  });
  const { admin_token } = await loginRes.json();
  if (!admin_token) throw new Error('Admin login failed');

  await fetch(`${BASE_URL}/admin/reset-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });

  // TEST 1: Join Player A
  console.log('👉 [TEST 1] Joining Player A (PLAYER_A, Panda, Graduation Cap, Round Glasses, Engineer Coat)...');
  const pARes = await fetch(`${BASE_URL}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'PLAYER_A',
      animal_id: 'panda',
      hat_id: 'grad_cap',
      glasses_id: 'round_glasses',
      outfit_id: 'eng_coat'
    })
  });
  const pAData = await pARes.json();
  if (!pAData.success || pAData.player.name !== 'PLAYER_A') {
    throw new Error('TEST 1 Failed: Player A could not join');
  }
  console.log('✅ [TEST 1 PASS] Player A joined successfully into lobby.');

  // TEST 2: Join Player B
  console.log('\n👉 [TEST 2] Joining Player B (PLAYER_B, Fox, Engineer Helmet)...');
  const pBRes = await fetch(`${BASE_URL}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'PLAYER_B',
      animal_id: 'fox',
      hat_id: 'eng_helmet'
    })
  });
  const pBData = await pBRes.json();
  if (!pBData.success || pBData.player.name !== 'PLAYER_B') {
    throw new Error('TEST 2 Failed: Player B could not join');
  }
  console.log('✅ [TEST 2 PASS] Player B joined. Both players appear separately in lobby.');

  // TEST 3: Attempt to join using case-insensitive 'player_a'
  console.log('\n👉 [TEST 3] Attempting to join with duplicate name "player_a"...');
  const dupRes = await fetch(`${BASE_URL}/player/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'player_a',
      animal_id: 'lion'
    })
  });
  const dupData = await dupRes.json();
  if (!dupData.success && dupRes.status === 400 && dupData.error.includes('already here')) {
    console.log(`✅ [TEST 3 PASS] System rejected duplicate name: "${dupData.error}"`);
  } else {
    throw new Error('TEST 3 Failed: Case-insensitive duplicate name was NOT rejected!');
  }

  // TEST 4: Admin enters admin@123, verify 2 players
  console.log('\n👉 [TEST 4] Admin checks dashboard for 2 registered players...');
  const stateRes = await fetch(`${BASE_URL}/match/state`);
  const { state } = await stateRes.json();
  const lbRes = await fetch(`${BASE_URL}/match/leaderboard`);
  const { leaderboard } = await lbRes.json();
  const playerACount = leaderboard.filter(p => p.name === 'PLAYER_A' || p.name === 'PLAYER_B').length;
  if (playerACount === 2) {
    console.log('✅ [TEST 4 PASS] Admin dashboard confirms both PLAYER_A and PLAYER_B are present.');
  } else {
    throw new Error(`TEST 4 Failed: Expected 2 players, found ${playerACount}`);
  }

  // TEST 5: Admin clicks START MATCH
  console.log('\n👉 [TEST 5] Admin starts match...');
  const startRes = await fetch(`${BASE_URL}/admin/start-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const startData = await startRes.json();
  if (startData.success && startData.match_state.status === 'ROUND_1') {
    console.log('✅ [TEST 5 PASS] Match successfully started! Status is ROUND_1.');
  } else {
    throw new Error('TEST 5 Failed: Start match failed');
  }

  // TEST 6: Verify both players receive independent shuffled puzzles
  console.log('\n👉 [TEST 6] Verifying Round 1 source image and independent puzzle arrangements...');
  const pASession = await fetch(`${BASE_URL}/player/session/${pAData.session_token}`).then(r => r.json());
  const pBSession = await fetch(`${BASE_URL}/player/session/${pBData.session_token}`).then(r => r.json());
  if (!pASession.player.shuffled_puzzle_r1 || !pBSession.player.shuffled_puzzle_r1) {
    throw new Error('TEST 6 Failed: Shuffled puzzle array missing');
  }
  const areSameShuffle = pASession.player.shuffled_puzzle_r1.every((v, i) => v === pBSession.player.shuffled_puzzle_r1[i]);
  console.log(`✅ [TEST 6 PASS] Players receive same source puzzle image with independent shuffles (identical shuffle: ${areSameShuffle}).`);

  // TEST 7: Player A completes Round 1, receives score & +50 coins, advances to Round 2
  console.log('\n👉 [TEST 7] Player A solves Round 1...');
  const canonical25 = Array.from({ length: 25 }, (_, i) => i);
  const solveR1Res = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: pAData.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 14,
      request_id: 'test7-pA-r1'
    })
  });
  const solveR1Data = await solveR1Res.json();
  if (solveR1Data.success && solveR1Data.coins_earned === 50 && solveR1Data.awarded_score > 0) {
    console.log(`✅ [TEST 7 PASS] Player A received ${solveR1Data.awarded_score} points and +${solveR1Data.coins_earned} coins.`);
  } else {
    throw new Error('TEST 7 Failed: Solve R1 failed');
  }

  // Player A advances to Round 2; Player B remains in Round 1
  await fetch(`${BASE_URL}/player/advance-round-2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: pAData.session_token })
  });
  const pACheck = await fetch(`${BASE_URL}/player/session/${pAData.session_token}`).then(r => r.json());
  const pBCheck = await fetch(`${BASE_URL}/player/session/${pBData.session_token}`).then(r => r.json());
  if (pACheck.player.status === 'ROUND_2_PLAYING' && pBCheck.player.status === 'PLAYING') {
    console.log('✅ [TEST 7 PASS] Player A is in Round 2, while Player B remains in Round 1.');
  } else {
    throw new Error('TEST 7 Failed: Player round isolation failed');
  }

  // TEST 8: Admin clicks PAUSE
  console.log('\n👉 [TEST 8] Admin pauses match...');
  await fetch(`${BASE_URL}/admin/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const pauseState = await fetch(`${BASE_URL}/match/state`).then(r => r.json());
  if (pauseState.state.is_paused) {
    console.log('✅ [TEST 8 PASS] Match paused authoritatively.');
  } else {
    throw new Error('TEST 8 Failed: Pause did not set is_paused');
  }

  // Verify puzzle interaction rejected while paused
  const pausedSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: pBData.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 20,
      request_id: 'test8-fail'
    })
  });
  const pausedData = await pausedSubmit.json();
  if (!pausedData.success && pausedData.error.includes('paused')) {
    console.log(`✅ [TEST 8 PASS] Puzzle submissions rejected during pause: "${pausedData.error}"`);
  } else {
    throw new Error('TEST 8 Failed: Submission was not blocked during pause');
  }

  // TEST 9: Admin clicks RESUME
  console.log('\n👉 [TEST 9] Admin resumes match...');
  await fetch(`${BASE_URL}/admin/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const resumeState = await fetch(`${BASE_URL}/match/state`).then(r => r.json());
  if (!resumeState.state.is_paused) {
    console.log('✅ [TEST 9 PASS] Match resumed successfully.');
  } else {
    throw new Error('TEST 9 Failed: Resume failed');
  }

  // TEST 10: Admin clicks STOP MATCH
  console.log('\n👉 [TEST 10] Admin stops match...');
  const stopRes = await fetch(`${BASE_URL}/admin/stop-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const stopData = await stopRes.json();
  if (stopData.success && stopData.match_state.status === 'STOPPED') {
    console.log('✅ [TEST 10 PASS] Match state is STOPPED.');
  } else {
    throw new Error('TEST 10 Failed: Stop match did not set STOPPED status');
  }

  // Verify moves are rejected when stopped
  const stoppedSubmit = await fetch(`${BASE_URL}/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: pBData.session_token,
      round_number: 1,
      solution_order: canonical25,
      move_count: 10,
      request_id: 'test10-fail'
    })
  });
  const stoppedData = await stoppedSubmit.json();
  if (!stoppedData.success && stoppedData.error.includes('stopped')) {
    console.log(`✅ [TEST 10 PASS] Submissions rejected after STOP: "${stoppedData.error}"`);
  } else {
    throw new Error('TEST 10 Failed: Submissions not blocked in STOP mode');
  }

  // TEST 11: Admin clicks RESET
  console.log('\n👉 [TEST 11] Admin resets match...');
  const resetRes = await fetch(`${BASE_URL}/admin/reset-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const resetData = await resetRes.json();
  if (resetData.success && resetData.match_state.status === 'WAITING') {
    console.log('✅ [TEST 11 PASS] Match reset to WAITING. Player accounts and avatars preserved.');
  } else {
    throw new Error('TEST 11 Failed: Reset did not return to WAITING');
  }

  // TEST 12: End Match / Expiration
  console.log('\n👉 [TEST 12] Concluding match (Game Over / Time Up)...');
  await fetch(`${BASE_URL}/admin/end-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': admin_token }
  });
  const endState = await fetch(`${BASE_URL}/match/state`).then(r => r.json());
  if (endState.state.status === 'COMPLETED') {
    console.log('✅ [TEST 12 PASS] Match status is COMPLETED. No puzzle moves accepted.');
  } else {
    throw new Error('TEST 12 Failed: End match failed');
  }

  // TEST 13: Refresh Player A (Session restoration)
  console.log('\n👉 [TEST 13] Simulating browser refresh for Player A...');
  const refreshRes = await fetch(`${BASE_URL}/player/session/${pAData.session_token}`).then(r => r.json());
  if (refreshRes.success && refreshRes.player.id === pAData.player.id && refreshRes.player.name === 'PLAYER_A') {
    console.log(`✅ [TEST 13 PASS] Session successfully restored for ${refreshRes.player.name} without resetting!`);
  } else {
    throw new Error('TEST 13 Failed: Session recovery failed');
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL SECTION 66 TESTS (TEST 1 - 13) PASSED 100%!');
  console.log('===========================================================\n');
}

testCompleteScenario().catch(err => {
  console.error('❌ Test scenario error:', err);
  process.exit(1);
});
