import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function StoreFront() {
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuites = async () => {
      try {
        const q = query(
          collection(db, 'suites'),
          where('visibility', '==', 'store')
        );
        const snap = await getDocs(q);
        const fetchedSuites = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Manually sort since we might not have a composite index for visibility + createdAt
        fetchedSuites.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
        setSuites(fetchedSuites);
      } catch (error) {
        console.error("Error fetching suites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuites();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-container"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {suites.length === 0 ? (
        <div className="col-span-full py-12 text-center border border-dashed border-outline-variant rounded-lg bg-surface-container-lowest">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant opacity-50 mb-3">production_quantity_limits</span>
          <h3 className="text-lg font-bold text-on-surface">Nenhuma Suite Disponível</h3>
          <p className="text-on-surface-variant text-sm mt-1">A loja está vazia no momento. Volte mais tarde!</p>
        </div>
      ) : (
        suites.map(suite => (
          <a key={suite.id} href={`/suite?id=${suite.id}`} className="group flex flex-col bg-surface border border-outline-variant rounded-xl overflow-hidden hover:border-primary-container hover:shadow-lg transition-all">
            {/* "Cover" Area - Minimalist for now */}
            <div className="h-32 bg-surface-container-high relative p-4 flex flex-col justify-end">
              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                {suite.storeCategory || 'General'}
              </div>
              <span className="material-symbols-outlined text-[40px] text-primary-container opacity-20 absolute top-4 left-4 group-hover:scale-110 group-hover:opacity-40 transition-all duration-300">
                extension
              </span>
              <h2 className="text-lg font-bold text-on-surface relative z-10 truncate">{suite.name}</h2>
            </div>
            
            {/* Details Area */}
            <div className="p-4 flex flex-col flex-1">
              <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 flex-1">
                {suite.description || 'Nenhuma descrição fornecida.'}
              </p>
              
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wide">Desenvolvedor</div>
                  <div className="text-sm font-bold text-on-surface truncate max-w-[150px]">{suite.authorName || 'Anônimo'}</div>
                </div>
                
                <div className="text-right">
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wide">Preço</div>
                  <div className="text-lg font-bold text-primary-container">
                    {!suite.price || suite.price === 0 ? 'Grátis' : `R$ ${Number(suite.price).toFixed(2).replace('.', ',')}`}
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))
      )}
    </div>
  );
}
