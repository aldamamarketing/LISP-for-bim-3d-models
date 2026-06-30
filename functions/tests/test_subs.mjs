import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('C:\\Users\\TM PROJETOS\\.gemini\\plugins\\firebase\\lispcentral-firebase-adminsdk-vswq2-7e0e7a1b02.json', 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function run() {
  const snap = await db.collection('subscriptions').where('tenantId', '==', '087wYtSrpcau1MBeCAeUi38um3x1').get();
  console.log(`Found ${snap.docs.length} subscriptions`);
  snap.docs.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}
run();
