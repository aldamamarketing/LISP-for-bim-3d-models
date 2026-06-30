import fetch from 'node-fetch';

const BASE_URL = 'https://us-central1-lispcentral.cloudfunctions.net/getRoutine';
const API_KEY = 'lc_key_20260603_123456';

async function testRoutine(hwId, routineName, scenarioName) {
  console.log(`\n--- Test: ${scenarioName} ---`);
  console.log(`Device: ${hwId} | Routine: ${routineName}`);
  
  try {
    const res = await fetch(`${BASE_URL}?apiKey=${API_KEY}&hwId=${hwId}&routine=${routineName}`);
    const text = await res.text();
    
    console.log(`Status: ${res.status}`);
    if (text.includes('PROTECAO ATIVADA')) {
      console.log(`Result: REJECTED (Protection active)`);
      console.log(`Message: ${text.substring(0, 150)}...`);
    } else if (text.includes('routineList')) {
      console.log(`Result: SUCCESS (Index Loaded)`);
    } else {
      console.log(`Result: SUCCESS (LISP Code Loaded)`);
      console.log(`Response Snippet: ${text.substring(0, 100)}...`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

async function runTests() {
  // Scenario 1: A PC that is globally linked (First-party testing)
  // We expect success for INDEX or first-party tools.
  await testRoutine('PC-AUTOCAD-NUEVO', 'INDEX', 'Globally Linked PC -> INDEX');
  
  // Scenario 2: A brand new PC that exceeds maxSeats (we have maxSeats=1 and PC-AUTOCAD-NUEVO is linked, plus Legacy)
  // We expect rejection for First-party tools since it exceeds maxSeats.
  await testRoutine('PC-BLOCKED-MAX', 'INDEX', 'New PC Exceeding maxSeats -> INDEX');

  // Scenario 3: Testing a third-party command with the blocked PC.
  // If we had a third party command assigned to 'PC-BLOCKED-MAX', it would pass. Since we don't, it will fail.
  // We'll just test a random routine name.
  await testRoutine('PC-BLOCKED-MAX', 'SOME_3RD_PARTY', 'New PC Exceeding maxSeats -> 3rd Party (No Sub)');
}

runTests();
