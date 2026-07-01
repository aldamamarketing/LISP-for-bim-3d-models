import React, { useState, useEffect, useRef } from 'react';
import { db, auth, functions } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export default function ContextSwitcher({ onContextChange }) {
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchTeams();
  }, [auth.currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTeams = async () => {
    const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const token = urlParams.get('token');

    if (!auth.currentUser && token) {
      try {
        const API_BASE = window.location.hostname === "localhost"
          ? "http://127.0.0.1:5001/lispcentral/us-central1"
          : "https://us-central1-lispcentral.cloudfunctions.net";
        const res = await fetch(`${API_BASE}/getTeams?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const list = await res.json();
          setTeams(list);
          if (list.length > 0 && !activeTeamId) handleSelection(list[0].id, list[0].role);
        }
      } catch (e) {
        console.error("Error fetching teams via API:", e);
      }
      return;
    }

    const list = [];
    try {
      const qPub = query(collection(db, "teams"), where("isPublic", "==", true));
      const pubSnap = await getDocs(qPub);
      pubSnap.forEach(d => list.push({ id: d.id, ...d.data(), isPublic: true }));
    } catch (e) {
      console.error("Error fetching public teams:", e);
    }

    if (auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const joined = userDoc.data().joinedTeams || [];
          for (const jt of joined) {
            const tDoc = await getDoc(doc(db, "teams", jt.teamId));
            if (tDoc.exists() && !list.find(t => t.id === tDoc.id)) {
              list.push({ id: tDoc.id, ...tDoc.data(), role: jt.role });
            }
          }
        }
      } catch (e) {
        console.error("Error fetching joined teams:", e);
      }
    }

    setTeams(list);
    if (list.length > 0 && !activeTeamId) {
      handleSelection(list[0].id, list[0].role);
    }
  };

  const handleSelection = (id, role = '') => {
    console.log("[ContextSwitcher] Selected option id:", id);
    if (id === 'ADD_NEW') {
      console.log("[ContextSwitcher] Showing add team modal.");
      setShowModal(true);
      setIsOpen(false);
      return;
    }
    setActiveTeamId(id);
    if (onContextChange) {
      console.log("[ContextSwitcher] Executing onContextChange with id:", id);
      onContextChange(id, role === 'OWNER');
    }
    setIsOpen(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    console.log("[ContextSwitcher] Intentando vincularse con código:", inviteCode);
    setJoining(true);
    setError('');

    try {
      console.log("[ContextSwitcher] Llamando a Cloud Function 'joinTeam'...");
      const joinTeamFn = httpsCallable(functions, 'joinTeam');
      const res = await joinTeamFn({ inviteCode: inviteCode.trim() });
      console.log("[ContextSwitcher] Respuesta de Cloud Function:", res.data);
      if (res.data.success) {
        setShowModal(false);
        setInviteCode('');
        await fetchTeams();
        handleSelection(res.data.teamId);
      }
    } catch (err) {
      console.error("[ContextSwitcher] Error en joinTeam:", err);
      setError(err.message || 'Código inválido o error de red.');
    } finally {
      setJoining(false);
    }
  };

  const activeTeamName = activeTeamId 
    ? (teams.find(t => t.id === activeTeamId)?.name || 'Unknown') 
    : 'None (Do not apply anything)';

  return (
    <div style={{ width: '100%', marginBottom: '4px', position: 'relative' }} ref={dropdownRef}>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          backgroundColor: '#222',
          color: '#eee',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
        }}
      >
        <span>{activeTeamName}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
          <path d={isOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#222',
          border: '1px solid #444',
          borderRadius: '4px',
          marginTop: '4px',
          zIndex: 100,
          maxHeight: '200px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <div 
            onClick={() => handleSelection('')}
            style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', color: activeTeamId === '' ? 'var(--tmd-orange)' : '#eee', backgroundColor: activeTeamId === '' ? '#333' : 'transparent', borderBottom: '1px solid #333' }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#333'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = activeTeamId === '' ? '#333' : 'transparent'; }}
          >
            None (Do not apply anything)
          </div>
          
          {teams.map(t => (
            <div 
              key={t.id}
              onClick={() => handleSelection(t.id, t.role)}
              style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', color: activeTeamId === t.id ? 'var(--tmd-orange)' : '#eee', backgroundColor: activeTeamId === t.id ? '#333' : 'transparent' }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = activeTeamId === t.id ? '#333' : 'transparent'; }}
            >
              {t.name} {t.isPublic ? '(Public)' : ''}
            </div>
          ))}

          <div 
            onClick={() => handleSelection('ADD_NEW')}
            style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', color: '#4ade80', borderTop: '1px solid #333', fontWeight: 'bold' }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#333'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Add... (Join a Team)
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '16px' }}>
          <div style={{ backgroundColor: '#222', border: '1px solid #444', borderRadius: '8px', width: '100%', maxWidth: '320px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>Join a Team</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleJoin} style={{ padding: '16px' }}>
              <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0 0 12px 0' }}>Enter the invite code provided by your CAD Manager.</p>
              <input 
                type="text" 
                placeholder="TEAM-XXXXX" 
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                style={{ width: '100%', backgroundColor: '#111', border: '1px solid #444', borderRadius: '4px', padding: '8px', textAlign: 'center', color: '#4ade80', fontFamily: 'monospace', fontSize: '1rem', marginBottom: '12px', letterSpacing: '2px', outline: 'none' }}
                autoFocus
              />
              {error && <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '0 0 12px 0' }}>{error}</p>}
              <button 
                type="submit" 
                disabled={joining || !inviteCode}
                style={{ width: '100%', backgroundColor: (joining || !inviteCode) ? '#444' : 'var(--tmd-orange)', color: (joining || !inviteCode) ? '#888' : '#fff', fontWeight: 'bold', padding: '8px', borderRadius: '4px', border: 'none', cursor: (joining || !inviteCode) ? 'not-allowed' : 'pointer' }}
              >
                {joining ? 'Validating...' : 'Join and Download Standard'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
