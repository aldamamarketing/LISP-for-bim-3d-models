import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "lispcentral",
  appId: "1:439823418692:web:e217acb7877c16cc438311",
  storageBucket: "lispcentral.firebasestorage.app",
  apiKey: "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c",
  authDomain: "lispcentral.firebaseapp.com",
  messagingSenderId: "439823418692",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
