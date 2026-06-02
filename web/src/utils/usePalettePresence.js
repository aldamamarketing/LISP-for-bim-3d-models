import { useState, useEffect } from 'react';

const HEARTBEAT_INTERVAL = 1500;
const TIMEOUT_THRESHOLD = 4000;

/**
 * Hook para mantener vivo el estado de una paleta y leer cuáles están activas.
 * @param {string} myId Identificador único de la paleta actual
 * @returns {Array} Array con los IDs de las paletas que están vivas
 */
export function usePalettePresence(myId) {
  const [activePalettes, setActivePalettes] = useState([]);

  useEffect(() => {
    if (!myId) return;
    
    const key = `lc_palette_alive_${myId}`;
    
    // Función para emitir mi propio latido
    const emitHeartbeat = () => {
      localStorage.setItem(key, Date.now().toString());
    };

    // Función para leer los latidos de todas las paletas
    const checkPresences = () => {
      const now = Date.now();
      const alive = [];
      // Iteramos sobre el storage buscando lc_palette_alive_
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lc_palette_alive_')) {
          const timestamp = parseInt(localStorage.getItem(k), 10);
          if (!isNaN(timestamp) && (now - timestamp < TIMEOUT_THRESHOLD)) {
            alive.push(k.replace('lc_palette_alive_', ''));
          } else {
            // Limpieza de muertos (opcional)
            localStorage.removeItem(k);
          }
        }
      }
      setActivePalettes(alive);
    };

    // Emitir inmediatamente y leer
    emitHeartbeat();
    checkPresences();

    const interval = setInterval(() => {
      emitHeartbeat();
      checkPresences();
    }, HEARTBEAT_INTERVAL);

    // Si otras ventanas cambian el storage, lo leemos
    const handleStorage = (e) => {
      if (e.key && e.key.startsWith('lc_palette_alive_')) {
        checkPresences();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      localStorage.removeItem(key); // Cleanup inmediato al cerrar bien
    };
  }, [myId]);

  return activePalettes;
}
