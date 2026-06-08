import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c",
  authDomain: "lispcentral.firebaseapp.com",
  projectId: "lispcentral",
  storageBucket: "lispcentral.firebasestorage.app",
  messagingSenderId: "439823418692",
  appId: "1:439823418692:web:e217acb7877c16cc438311",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function simulateAutoCAD() {
  try {
    console.log("1. Authenticating as AutoCAD ping emulator...");
    const userCredential = await signInWithEmailAndPassword(auth, "123456@gmail.com", "123456");
    const user = userCredential.user;
    console.log(`Authenticated as ${user.uid}`);

    const semanticUid = "USR-20260603-123456";
    const hwId = "PC-AUTOCAD-NUEVO";
    console.log(`2. Simulating backend writing device ${hwId} to firestore...`);
    
    await setDoc(doc(db, "users", semanticUid, "devices", hwId), {
      name: `Simulated Desktop ${hwId}`,
      lastIp: "127.0.0.1",
      lastLoginAt: serverTimestamp(),
      hwId: hwId,
      country: "BR",
      city: "São Paulo"
    });

    console.log(`3. SUCCESS! Device ${hwId} injected into production DB.`);
    process.exit(0);
  } catch (error) {
    console.error("Simulation failed:", error);
    process.exit(1);
  }
}

simulateAutoCAD();
