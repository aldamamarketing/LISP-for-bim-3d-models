import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Fix service account path for windows
const keyPath = "C:\\Users\\TM PROJETOS\\.gemini\\plugins\\firebase\\lispcentral-firebase-adminsdk-vswq2-7e0e7a1b02.json";

async function run() {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const app = initializeApp({ credential: cert(serviceAccount) });
    const db = getFirestore(app);

    const usersSnap = await db.collection('users').get();
    let created = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      // Check if user already has a global subscription
      const subSnap = await db.collection('subscriptions')
        .where('tenantId', '==', uid)
        .where('isGlobal', '==', true)
        .get();

      if (subSnap.empty) {
        // Create global subscription
        await db.collection('subscriptions').add({
          tenantId: uid,
          isGlobal: true,
          purchasedSeats: 1,
          assignedDevices: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created Global Subscription for user: ${uid}`);
        created++;
      } else {
        skipped++;
      }
    }

    console.log(`\nMigration complete! Created: ${created}, Skipped (already had one): ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error("Error running script:", err);
    process.exit(1);
  }
}

run();
