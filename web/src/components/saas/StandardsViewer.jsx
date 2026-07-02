import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export default function StandardsViewer({ teamId }) {
  const [standard, setStandard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    
    // Use onSnapshot to immediately update the web dashboard when LISP pushes new JSON
    const docRef = doc(db, "standards", teamId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setStandard(snap.data().data);
      } else {
        setStandard(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error al suscribirse a standards:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId]);

  if (loading) return <div className="text-gray-400 p-4 animate-pulse">Analyzing standards database...</div>;

  if (!standard) return (
    <div className="bg-amber-900/20 text-amber-500 p-6 rounded-lg border border-amber-800/50 flex flex-col items-center">
      <svg className="w-12 h-12 mb-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      <h3 className="font-bold text-lg mb-1">Empty Golden File</h3>
      <p className="text-center text-sm text-amber-600/80 max-w-md">
        You haven't synced your company standards yet. Open your template file (.dwt) in AutoCAD and run the command <strong>LC_STANDARDS</strong>.
      </p>
    </div>
  );

  const layerCount = Object.keys(standard.layers || {}).length;
  const textStyleCount = Object.keys(standard.textStyles || {}).length;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-inner overflow-hidden">
      <div className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-bold text-gray-200">Configured Standard (Golden File)</h3>
        <span className="bg-green-900/50 text-green-400 text-xs px-2 py-1 rounded-full border border-green-800">Synced</span>
      </div>
      
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Layers Column */}
        <div>
          <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center justify-between border-b border-gray-700 pb-2">
            <span>OFFICIAL LAYERS</span>
            <span className="bg-gray-800 px-2 py-0.5 rounded-full text-xs text-gray-400">{layerCount} items</span>
          </h4>
          <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(standard.layers || {}).map(([name, props]) => (
              <div key={name} className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition px-2 rounded">
                <span className="font-mono text-sm text-gray-300 truncate w-1/2" title={name}>{name}</span>
                <div className="flex items-center space-x-3 text-xs text-gray-500 w-1/2 justify-end">
                  <span className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-1 inline-block border border-gray-600" style={{ backgroundColor: getAutoCADColor(props.color) }}></span>
                    {props.color}
                  </span>
                  <span className="truncate w-16 text-right" title={props.linetype}>{props.linetype}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TextStyles Column */}
        <div>
          <h4 className="text-sm font-bold text-indigo-400 mb-3 flex items-center justify-between border-b border-gray-700 pb-2">
            <span>TEXT STYLES</span>
            <span className="bg-gray-800 px-2 py-0.5 rounded-full text-xs text-gray-400">{textStyleCount} items</span>
          </h4>
          <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(standard.textStyles || {}).map(([name, props]) => (
              <div key={name} className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition px-2 rounded">
                <span className="font-mono text-sm text-gray-300 truncate w-1/2" title={name}>{name}</span>
                <span className="text-xs text-gray-500 w-1/2 text-right truncate" title={props.font}>{props.font}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple helper to approximate ACI colors for the web UI
function getAutoCADColor(aci) {
  const colors = {
    1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 
    5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0'
  };
  return colors[aci] || '#AAAAAA';
}
