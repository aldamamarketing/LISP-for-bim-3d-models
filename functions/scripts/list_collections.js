const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'lispcentral' });

async function listCollections() {
  const db = admin.firestore();
  const cols = await db.listCollections();
  cols.forEach(col => console.log('Collection:', col.id));
}

listCollections().catch(console.error);
