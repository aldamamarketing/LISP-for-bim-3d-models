const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "lispcentral"
});

async function listBuckets() {
  try {
    const [buckets] = await admin.storage().getBuckets();
    console.log("Buckets disponibles:");
    buckets.forEach(bucket => {
      console.log(bucket.name);
    });
  } catch (error) {
    console.error("Error obteniendo buckets:", error);
  }
}

listBuckets();
