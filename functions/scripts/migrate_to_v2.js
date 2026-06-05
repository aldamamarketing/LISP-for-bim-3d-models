const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS env var before running this script
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

function extractSlug(tenantId) {
  // If tenantId is a long string, maybe take first 8 chars or just use it entirely if it's safe for IDs.
  // We'll just replace non-alphanumeric chars with dashes.
  return tenantId.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

async function migrate() {
  console.log('Starting migration to V2...');
  
  const lispFilesSnap = await db.collection('lispFiles').get();
  console.log(`Found ${lispFilesSnap.size} lispFiles to migrate.`);

  for (const doc of lispFilesSnap.docs) {
    const data = doc.data();
    if (!data.tenantId || !data.lispId) {
      console.warn(`Skipping document ${doc.id} due to missing tenantId or lispId.`);
      continue;
    }

    const tenantSlug = extractSlug(data.tenantId);
    
    // 1. Create the Command document
    const cmdId = `CMD-${tenantSlug}-${data.lispId}`;
    const cmdRef = db.collection('commands').doc(cmdId);
    
    await cmdRef.set({
      lispFileId: doc.id,
      tenantId: data.tenantId,
      commandName: data.lispId,
      friendlyName: data.friendlyName || data.lispId,
      svgIcon: data.svgIcon || '',
      description: data.description || '',
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Migrated command: ${cmdId}`);

    // 2. Ensure default Suite exists
    const suiteId = `SUITE-${tenantSlug}-core`;
    const suiteRef = db.collection('suites').doc(suiteId);
    await suiteRef.set({
      tenantId: data.tenantId,
      name: 'Core Toolset',
      description: 'Default suite generated from V1 migration',
      visibility: 'private',
      sortOrder: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 3. Ensure default Group exists
    const groupId = `GRP-${tenantSlug}-core-custom`;
    const groupRef = db.collection('groups').doc(groupId);
    await groupRef.set({
      suiteId: suiteId,
      tenantId: data.tenantId,
      name: data.group || 'Custom Tools',
      description: 'Default group generated from V1 migration',
      sortOrder: 0
    }, { merge: true });

    // 4. Link Command to Group
    const gcmdId = `GCMD-${groupId}-${cmdId}`;
    const gcmdRef = db.collection('groupCommands').doc(gcmdId);
    await gcmdRef.set({
      groupId: groupId,
      commandId: cmdId,
      sortOrder: 0
    }, { merge: true });
  }

  console.log('Migration to V2 completed successfully!');
}

migrate().catch(console.error);
