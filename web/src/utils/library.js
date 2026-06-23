import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';

export const saveToGlobalLibrary = async (assetData) => {
  if (!auth.currentUser) throw new Error("Debes iniciar sesión para aportar a la biblioteca.");
  
  // assetData debe contener: { id, type, name, description, category, code }
  const assetRef = doc(db, 'publicAssets', assetData.id);
  const snap = await getDoc(assetRef);
  if (!snap.exists()) {
    await setDoc(assetRef, {
      ...assetData,
      createdAt: new Date().toISOString(),
      authorUid: auth.currentUser.uid
    });
  }
};

export const addToFavorites = async (assetDataOrId) => {
  if (!auth.currentUser) throw new Error("Debes iniciar sesión para guardar favoritos.");
  const isString = typeof assetDataOrId === 'string';
  const assetId = isString ? assetDataOrId : assetDataOrId.id;
  const dataToSave = isString ? { addedAt: new Date().toISOString() } : { ...assetDataOrId, addedAt: new Date().toISOString() };
  
  const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, assetId);
  await setDoc(favRef, dataToSave);
};

export const removeFromFavorites = async (assetId) => {
  if (!auth.currentUser) throw new Error("Debes iniciar sesión.");
  const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, assetId);
  await deleteDoc(favRef);
};

export const getPublicAssets = async (type) => {
  const q = query(collection(db, 'publicAssets'), where('type', '==', type));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getUserFavorites = async (type) => {
  if (!auth.currentUser) return [];
  
  const favSnap = await getDocs(collection(db, `users/${auth.currentUser.uid}/favorites`));
  if (favSnap.empty) return [];
  
  const allAssets = await getPublicAssets(type);
  
  return favSnap.docs.map(d => {
    const favData = d.data();
    // Si el favorito contiene la data completa (colección privada)
    if (favData.code && favData.type === type) {
      return { id: d.id, ...favData };
    }
    // Si solo es una referencia a un asset público
    return allAssets.find(a => a.id === d.id);
  }).filter(Boolean);
};
