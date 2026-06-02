import React from 'react';
import PaletteNavBar from './PaletteNavBar';

export default function PropertiesPalette() {
  return (
    <div style={{ backgroundColor: '#181818', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Bar Navigation */}
      <PaletteNavBar activePalette="properties" />

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
