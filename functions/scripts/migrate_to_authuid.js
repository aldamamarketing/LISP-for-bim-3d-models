const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

async function migrate() {
  const usersSnap = await db.collection("users").get();
  
  for (const userDoc of usersSnap.docs) {
    const oldId = userDoc.id;
    const data = userDoc.data();
    
    // Skip if already an Auth UID (doesn't start with "USR-")
    if (!oldId.startsWith("USR-")) {
      console.log(`Skipping ${oldId} — already migrated or not semantic.`);
      continue;
    }
    
    // Find Auth UID by email
    let authUid;
    try {
      const authUser = await auth.getUserByEmail(data.email);
      authUid = authUser.uid;
    } catch (err) {
      console.error(`Cannot find Auth user for ${data.email}. Skipping.`);
      continue;
    }
    
    console.log(`Migrating: ${oldId} → ${authUid} (${data.email})`);
    
    // 1. Create new user doc with Auth UID as ID
    const slug = oldId.replace("USR-", "").replace(/^\d{8}-/, ""); // Extract readable slug
    await db.collection("users").doc(authUid).set({
      ...data,
      slug: slug,
      legacyId: oldId, // Keep reference for debugging
    });
    
    // 2. Migrate devices subcollection
    const devicesSnap = await db.collection("users").doc(oldId).collection("devices").get();
    for (const devDoc of devicesSnap.docs) {
      await db.collection("users").doc(authUid).collection("devices").doc(devDoc.id).set(devDoc.data());
      await devDoc.ref.delete();
    }
    
    // 3. Update tenantId in all child collections
    const collections = ["lispFiles", "commands", "suites", "groups", "groupFiles", "subscriptions", "feedback"];
    for (const collName of collections) {
      const snap = await db.collection(collName).where("tenantId", "==", oldId).get();
      for (const d of snap.docs) {
        await d.ref.update({ tenantId: authUid, tenantSlug: slug });
        console.log(`  Updated ${collName}/${d.id}`);
      }
    }
    
    // 4. Update ownerId in suites (some suites use ownerId instead of tenantId)
    const ownedSuites = await db.collection("suites").where("ownerId", "==", oldId).get();
    for (const d of ownedSuites.docs) {
      await d.ref.update({ ownerId: authUid });
    }
    
    // 5. Fix global suite/subscription IDs that reference the old semantic ID
    const oldGlobalSuiteId = `global_${oldId}`;
    const newGlobalSuiteId = `global_${authUid}`;
    const oldGlobalSuite = await db.collection("suites").doc(oldGlobalSuiteId).get();
    if (oldGlobalSuite.exists) {
      await db.collection("suites").doc(newGlobalSuiteId).set({
        ...oldGlobalSuite.data(), ownerId: authUid
      });
      await db.collection("suites").doc(oldGlobalSuiteId).delete();
      console.log(`  Migrated global suite: ${oldGlobalSuiteId} → ${newGlobalSuiteId}`);
    }
    
    const oldGlobalSubId = `sub_global_${oldId}`;
    const newGlobalSubId = `sub_global_${authUid}`;
    const oldGlobalSub = await db.collection("subscriptions").doc(oldGlobalSubId).get();
    if (oldGlobalSub.exists) {
      await db.collection("subscriptions").doc(newGlobalSubId).set({
        ...oldGlobalSub.data(), tenantId: authUid, suiteId: newGlobalSuiteId
      });
      await db.collection("subscriptions").doc(oldGlobalSubId).delete();
      console.log(`  Migrated global sub: ${oldGlobalSubId} → ${newGlobalSubId}`);
    }
    
    // 6. Delete old user doc
    await db.collection("users").doc(oldId).delete();
    console.log(`✅ Migration complete for ${data.email}`);
  }
  
  console.log("🎉 All users migrated successfully.");
}

migrate().catch(console.error);
