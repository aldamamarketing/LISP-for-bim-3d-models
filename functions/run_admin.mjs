import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const keyPath = "C:\\Users\\TM PROJETOS\\.gemini\\plugins\\firebase\\lispcentral-firebase-adminsdk-vswq2-7e0e7a1b02.json";
console.log("Checking path:", keyPath);
console.log("Exists:", fs.existsSync(keyPath));

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function run() {
  const usersSnap = await db.collection('users').get();
  console.log("Users found:", usersSnap.docs.length);
  process.exit(0);
}
run();
