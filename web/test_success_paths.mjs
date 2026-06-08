
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, updateDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c",
  authDomain: "lispcentral.firebaseapp.com",
  projectId: "lispcentral",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BASE_URL = 'https://us-central1-lispcentral.cloudfunctions.net/getRoutine';
const API_KEY = 'lc_key_20260603_123456';
const TENANT_ID = 'USR-20260603-123456';

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
  // 1. Authenticate to modify DB
  const userCredential = await signInWithEmailAndPassword(auth, "123456@gmail.com", "123456");
  
  // 2. Increase maxSeats to 3 to simulate having "Free Seats"
  await updateDoc(doc(db, "users", TENANT_ID), { maxSeats: 3 });
  console.log("\n[DB] Increased maxSeats to 3 for First-Party test.");

  // Scenario 1: Brand new PC. Should Auto-link and succeed.
  await testRoutine('PC-BRAND-NEW-AUTO', 'INDEX', 'Brand New PC with Free Seats (Auto-Link)');

  // 3. Create a fake Third-Party Subscription assigned to 'PC-BLOCKED-MAX'
  const subId = 'SUB-TEST-123';
  await setDoc(doc(db, "subscriptions", subId), {
    tenantId: TENANT_ID,
    suiteId: 'suite-third-party',
    assignedDevices: ['PC-BLOCKED-MAX'],
    status: 'active'
  });
  console.log("\n[DB] Created Third-Party subscription assigned to PC-BLOCKED-MAX.");

  // Scenario 2: Test third-party command for the manually assigned PC.
  // Although PC-BLOCKED-MAX is NOT globalLinked, it is assigned to the subscription. So it should succeed!
  await testRoutine('PC-BLOCKED-MAX', 'SOME_3RD_PARTY', '3rd Party Suite Request (Manually Assigned PC)');

  process.exit(0);
}

runTests();
