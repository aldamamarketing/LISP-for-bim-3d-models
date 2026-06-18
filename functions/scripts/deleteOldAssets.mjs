import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function deleteCollection() {
  console.log("Limpiando base de datos equivocada (Barbearia)...");
  const collectionRef = db.collection('publicAssets');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('No hay documentos que borrar.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Borrados ${snapshot.size} documentos de publicAssets.`);
}

deleteCollection().catch(console.error);
