import React from 'react';

import GlobalHeader from './layout/GlobalHeader';

export default function PropertiesPalette({ isUnified = false }) {
  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Container */}
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
        {!isUnified ? (
          <div style={{ padding: '8px 10px', backgroundColor: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--tmd-orange)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tmd-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LispCentral Propiedades
              </span>
            </div>
          </div>
        ) : (
          <GlobalHeader title="LispCentral Propiedades" />
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h3 style={{ color: 'var(--tmd-orange)', marginBottom: '8px' }}>Propiedades LISP</h3>
        <p style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', maxWidth: '250px' }}>
          Esta paleta reaccionará a las selecciones en AutoCAD para editar propiedades dinámicas en el futuro.
        </p>
      </div>

    </div>
  );
}
