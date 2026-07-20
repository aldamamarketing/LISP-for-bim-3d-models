import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { showToast } from '../Toast';

export default function VersionHistoryModal({ fileId, fileName, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const q = query(
          collection(db, 'lispFileVersions'),
          where('fileId', '==', fileId),
          orderBy('version', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Si no hay versiones guardadas (archivos antiguos antes del sistema de versionado)
        // podríamos mostrar solo la actual, pero por ahora lo manejamos
        setVersions(data);
      } catch (err) {
        console.error("Error fetching version history:", err);
        showToast('Erro ao carregar o histórico de versões.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchVersions();
  }, [fileId]);

  const handleDownload = async (storagePath, versionNumber) => {
    try {
      const fileRef = ref(storage, storagePath);
      const url = await getDownloadURL(fileRef);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace('.lsp', `_v${versionNumber}.lsp`); // Trigger download with specific name
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast(`Download da versão ${versionNumber} iniciado.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao baixar o arquivo.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container">
          <div>
            <h3 className="text-lg font-bold text-on-surface m-0">Histórico de Versões</h3>
            <p className="text-sm text-on-surface-variant font-code-sm m-0">{fileName}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-white p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-on-surface-variant">Carregando histórico...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              Nenhum histórico encontrado para este arquivo.<br />
              <span className="text-xs opacity-75 mt-2 block">Arquivos antigos podem não ter registro de versão.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((v, i) => (
                <div key={v.id} className="bg-surface-container p-4 rounded-lg border border-outline-variant flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary-container">Versão {v.version}</span>
                      {i === 0 && <span className="bg-primary-container/20 text-primary-container text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">Atual</span>}
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      Data: {new Date(v.uploadedAt).toLocaleString()}
                    </div>
                    {v.changelog && (
                      <div className="mt-2 text-sm text-on-surface italic border-l-2 border-primary-container pl-2">
                        "{v.changelog}"
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDownload(v.storagePath, v.version)}
                    className="flex items-center gap-1 text-sm bg-surface hover:bg-outline-variant text-on-surface border border-outline-variant px-3 py-1.5 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
