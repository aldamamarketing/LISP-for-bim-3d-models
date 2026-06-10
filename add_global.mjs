import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const config = {};
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.split('=');
    if (k.startsWith('VITE_FIREBASE_')) {
       config[k.replace('VITE_FIREBASE_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = v.trim().replace(/"/g, '');
    }
  }
});
config.apiKey = config.apikey;
config.projectId = config.projectid;
config.storageBucket = config.storagebucket;
config.messagingSenderId = config.messagingsenderid;
config.appId = config.appid;

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  await signInWithEmailAndPassword(auth, "123456@gmail.com", "aldama"); // Using the correct password
  const uid = auth.currentUser.uid;
  console.log("Logged in as:", uid);
  
  const subSnap = await getDocs(query(collection(db, 'subscriptions'), where('tenantId', '==', uid), where('isGlobal', '==', true)));
  
  if (subSnap.empty) {
     console.log("No global suite found. Creating one...");
     await addDoc(collection(db, 'subscriptions'), {
          tenantId: uid,
          isGlobal: true,
          purchasedSeats: 1,
          assignedDevices: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
     });
     console.log("Created global suite.");
  } else {
     console.log("Global suite already exists.");
  }
  process.exit(0);
}
run();
