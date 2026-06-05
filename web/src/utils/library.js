import { db, auth } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  documentId,
} from "firebase/firestore";

export const saveToGlobalLibrary = async (assetData) => {
  if (!auth.currentUser)
    throw new Error("Debes iniciar sesión para aportar a la biblioteca.");

  // assetData debe contener: { id, type, name, description, category, code }
  const assetRef = doc(db, "publicAssets", assetData.id);
  const snap = await getDoc(assetRef);
  if (!snap.exists()) {
    await setDoc(assetRef, {
      ...assetData,
      createdAt: new Date().toISOString(),
      authorUid: auth.currentUser.uid,
    });
  }
};

export const addToFavorites = async (assetId) => {
  if (!auth.currentUser)
    throw new Error("Debes iniciar sesión para guardar favoritos.");
  const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, assetId);
  await setDoc(favRef, { addedAt: new Date().toISOString() });
};

export const removeFromFavorites = async (assetId) => {
  if (!auth.currentUser) throw new Error("Debes iniciar sesión.");
  const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, assetId);
  await deleteDoc(favRef);
};

export const getPublicAssets = async (type) => {
  const q = query(collection(db, "publicAssets"), where("type", "==", type));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getUserFavorites = async (type) => {
  if (!auth.currentUser) return [];

  const favSnap = await getDocs(
    collection(db, `users/${auth.currentUser.uid}/favorites`),
  );
  const favIds = favSnap.docs.map((d) => d.id);

  if (favIds.length === 0) return [];

  const fetchedFavorites = [];
  // Chunk favIds into batches of 30 to prevent over-fetching
  for (let i = 0; i < favIds.length; i += 30) {
    const chunk = favIds.slice(i, i + 30);
    const q = query(
      collection(db, "publicAssets"),
      where(documentId(), "in", chunk),
    );
    const snap = await getDocs(q);

    // Filter locally by type to avoid requiring a composite index
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.type === type) {
        fetchedFavorites.push({ id: d.id, ...data });
      }
    });
  }

  return fetchedFavorites;
};
