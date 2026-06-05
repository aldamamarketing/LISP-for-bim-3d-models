import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyADsqbH_lKKFcugqTexryO40u5VMJxzx0c",
  authDomain: "lispcentral.firebaseapp.com",
  projectId: "lispcentral",
  storageBucket: "lispcentral.firebasestorage.app",
  messagingSenderId: "439823418692",
  appId: "1:439823418692:web:e217acb7877c16cc438311",
  measurementId: "G-N5PR91DWEJ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// App Check Initialization
// Bypass App Check for local development to avoid 403 Forbidden errors
if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Lcw9wkqAAAAAIL9Z_M_p_7rW-bJmG4D2M-N43Qh'), // Reemplace por su clave real de ReCAPTCHA Enterprise
    isTokenAutoRefreshEnabled: true
  });
}

// Analytics — inicialización lazy (solo en browser, nunca en SSR)
let analyticsInstance = null;
export const getFirebaseAnalytics = async () => {
  if (!analyticsInstance && typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }
  return analyticsInstance;
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (window.location.pathname.includes('/login')) {
      window.location.href = '/dashboard';
    }
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
