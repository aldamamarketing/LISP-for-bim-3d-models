import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import StandardsViewer from './StandardsViewer';

export default function TeamManager() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      // In a real flow, this component renders when auth is ready
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      const q = query(collection(db, "teams"), where("ownerId", "==", auth.currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTeam({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setLoading(false);
    };
    
    // Simulate auth readiness check loop or subscribe to onAuthStateChanged in parent
    fetchTeam();
  }, []);

  const handleCreateTeam = async () => {
    if (!auth.currentUser) return;
    const code = "TEAM-" + Math.random().toString(36).substr(2, 5).toUpperCase();
    const newTeam = {
      ownerId: auth.currentUser.uid,
      name: "Mi Entorno Corporativo",
      inviteCode: code,
      subscriptionTier: "FREE",
      subscriptionActive: true,
      isPublic: false,
      createdAt: serverTimestamp()
    };
    
    try {
      const docRef = await addDoc(collection(db, "teams"), newTeam);
      setTeam({ id: docRef.id, ...newTeam });
    } catch (e) {
      console.error("Error creating team:", e);
      alert("Error al crear el equipo");
    }
  };

  if (loading) return <div className="text-gray-400 p-6 text-center">Cargando tu entorno...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4">
      <div className="bg-gray-800 p-6 rounded-lg text-white border border-gray-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          CAD Manager Dashboard
        </h2>
        
        {!team ? (
          <div className="text-center p-12 bg-gray-900 rounded-lg border border-gray-700 mt-4">
            <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <h3 className="text-xl font-bold mb-2">Centraliza las Normas de tu Equipo</h3>
            <p className="mb-6 text-gray-400 max-w-md mx-auto">Crea un entorno corporativo privado para asegurar que todos tus dibujantes trabajen bajo los mismos estándares de capas y bloques.</p>
            <button 
              onClick={handleCreateTeam}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform hover:scale-105"
            >
              Crear Entorno Privado
            </button>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Invite Code Card */}
            <div className="bg-gray-900 p-5 rounded-lg border border-gray-700 shadow-inner flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">Código de Enlace Directo</h3>
                <p className="text-sm text-gray-400 mt-1">Comparte este código con tu equipo para que reciban la norma en AutoCAD.</p>
              </div>
              <div className="mt-4 md:mt-0 flex items-center bg-gray-800 p-2 rounded border border-gray-600">
                <code className="text-green-400 px-4 py-1 text-2xl font-mono tracking-widest font-bold">
                  {team.inviteCode}
                </code>
                <button 
                  onClick={() => navigator.clipboard.writeText(team.inviteCode)}
                  className="ml-4 bg-gray-700 hover:bg-gray-600 p-2 rounded transition text-sm"
                  title="Copiar al portapapeles"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>
            </div>
            
            {/* Standards Viewer Embedded */}
            <StandardsViewer teamId={team.id} />
            
          </div>
        )}
      </div>
    </div>
  );
}
