const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkDb() {
  try {
    const lispFilesSnap = await db.collection('lispFiles').get();
    console.log(`[DB CHECK] lispFiles count: ${lispFilesSnap.size}`);
    
    const commandsSnap = await db.collection('commands').get();
    console.log(`[DB CHECK] commands count: ${commandsSnap.size}`);
    
    if (lispFilesSnap.size > 0 && commandsSnap.size === 0) {
      console.log(`\n[WARNING] You have lispFiles but NO commands! You need to run the migration script.`);
    } else if (commandsSnap.size > 0) {
      console.log(`\n[OK] The commands collection is populated.`);
    }

    // Check what the test user actually owns
    // Find the user with the Beta Tester key: lc_key_20260611_123456
    const userSnap = await db.collection('users').where('apiKey', '==', 'lc_key_20260611_123456').get();
    if (!userSnap.empty) {
      const user = userSnap.docs[0];
      console.log(`\n[USER CHECK] Found user: ${user.data().email} (ID: ${user.id})`);
      
      const ownLisps = await db.collection('lispFiles').where('tenantId', '==', user.id).get();
      console.log(`[USER CHECK] User owns ${ownLisps.size} lispFiles.`);
      
      const ownCmds = await db.collection('commands').where('tenantId', '==', user.id).get();
      console.log(`[USER CHECK] User owns ${ownCmds.size} commands.`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

checkDb();
