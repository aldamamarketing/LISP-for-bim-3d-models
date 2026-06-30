const admin = require("firebase-admin");

// Fetch the service account key from local config if running locally, or use default credentials.
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanDB() {
  const publicAssetsRef = db.collection('publicAssets');
  const snapshot = await publicAssetsRef.get();

  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log('Deleted all publicAssets documents.');
}

cleanDB().catch(console.error);
