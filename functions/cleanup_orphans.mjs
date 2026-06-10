import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const keyPath = "./serviceAccountKey.json";

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(isDryRun ? "--- DRY RUN (No changes will be made) ---" : "--- REAL RUN (Data will be deleted/migrated) ---");

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const app = initializeApp({ credential: cert(serviceAccount) });
    const db = getFirestore(app);

    let deletedGroupFiles = 0;
    let deletedGroupCommands = 0; 
    let migratedGroupCommands = 0;
    let deletedSubs = 0;
    let deletedReviews = 0;

    // 1. Scan groupFiles for orphans (missing group or missing file)
    console.log("Scanning groupFiles...");
    const gfSnap = await db.collection("groupFiles").get();
    for (const doc of gfSnap.docs) {
      const data = doc.data();
      const groupSnap = await db.collection("groups").doc(data.groupId).get();
      const fileSnap = await db.collection("lispFiles").doc(data.fileId).get();
      
      if (!groupSnap.exists || !fileSnap.exists) {
        console.log(`Orphaned groupFile found: ${doc.id} (Group exists: ${groupSnap.exists}, File exists: ${fileSnap.exists})`);
        if (!isDryRun) await doc.ref.delete();
        deletedGroupFiles++;
      }
    }

    // 2. Scan groupCommands (Migrate what we can, then delete all)
    console.log("Migrating and purging groupCommands...");
    const gcSnap = await db.collection("groupCommands").get();
    for (const doc of gcSnap.docs) {
      const data = doc.data();
      
      const cmdSnap = await db.collection("commands").doc(data.commandId).get();
      if (cmdSnap.exists) {
        const cmdData = cmdSnap.data();
        const fileId = cmdData.lispFileId;
        const groupId = data.groupId;
        
        const groupSnap = await db.collection("groups").doc(groupId).get();
        
        if (groupSnap.exists) {
            const gfId = `GFILE-${groupId}-${fileId}`;
            const existingGf = await db.collection("groupFiles").doc(gfId).get();
            if (!existingGf.exists) {
                console.log(`Migrating command assignment to file assignment: ${gfId}`);
                if (!isDryRun) {
                    await db.collection("groupFiles").doc(gfId).set({
                        groupId: groupId,
                        fileId: fileId,
                        sortOrder: data.sortOrder || 0
                    });
                }
                migratedGroupCommands++;
            }
        }
      }
      
      console.log(`Deleting groupCommand: ${doc.id}`);
      if (!isDryRun) await doc.ref.delete();
      deletedGroupCommands++;
    }

    // 3. Scan subscriptions
    console.log("Scanning non-global subscriptions...");
    const subSnap = await db.collection("subscriptions").where("isGlobal", "==", false).get();
    for (const doc of subSnap.docs) {
      const data = doc.data();
      if (data.suiteId) {
        const suiteSnap = await db.collection("suites").doc(data.suiteId).get();
        if (!suiteSnap.exists) {
          console.log(`Orphaned subscription found: ${doc.id} (Suite missing)`);
          if (!isDryRun) await doc.ref.delete();
          deletedSubs++;
        }
      }
    }

    // 4. Scan reviews
    console.log("Scanning reviews...");
    const revSnap = await db.collection("reviews").get();
    for (const doc of revSnap.docs) {
      const data = doc.data();
      if (data.suiteId) {
        const suiteSnap = await db.collection("suites").doc(data.suiteId).get();
        if (!suiteSnap.exists) {
          console.log(`Orphaned review found: ${doc.id} (Suite missing)`);
          if (!isDryRun) await doc.ref.delete();
          deletedReviews++;
        }
      }
    }

    console.log("\n--- SUMMARY ---");
    console.log(`groupFiles deleted: ${deletedGroupFiles}`);
    console.log(`groupCommands migrated: ${migratedGroupCommands}`);
    console.log(`groupCommands deleted: ${deletedGroupCommands}`);
    console.log(`subscriptions deleted: ${deletedSubs}`);
    console.log(`reviews deleted: ${deletedReviews}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
