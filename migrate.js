const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Just in case, I will try applicationDefault first

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

async function migrate() {
  const publicRef = db.collection('publicAssets');
  const privateRef = db.collection('privateAssets');
  
  const snapshot = await publicRef.where('category', '==', 'Baseline').get();
  
  let count = 0;
  for (const doc of snapshot.docs) {
    if (doc.id.startsWith('hatch_mvp_')) {
      const data = doc.data();
      await privateRef.doc(doc.id).set(data);
      await publicRef.doc(doc.id).delete();
      count++;
    }
  }
  console.log(`Migrated ${count} documents to privateAssets`);
}
migrate().catch(console.error);
