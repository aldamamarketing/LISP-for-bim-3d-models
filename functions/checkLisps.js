const admin = require('firebase-admin');
admin.initializeApp({ projectId: "lispcentral" });

async function checkLispFiles() {
  const db = admin.firestore();
  const lisps = await db.collection("lispFiles").get();
  console.log("Total lisp files:", lisps.size);
  lisps.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

checkLispFiles().catch(console.error);
