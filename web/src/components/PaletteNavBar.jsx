import React from 'react';
import { executeInAutoCAD } from '../utils/autocadBridge';

export default function PaletteNavBar({ activePalette }) {
  const navItems = [
    { id: 'commands', label: 'Comandos', icon: '🛠️', cmd: '(C:LC)\n' },
    { id: 'resources', label: 'Recursos', icon: '📦', cmd: '(C:RECURSOS)\n' },
    { id: 'properties', label: 'Propiedades', icon: '📋', cmd: '(C:LC_PROP)\n' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '4px 8px',
      backgroundColor: '#111',
      borderBottom: '1px solid #333',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {navItems.map(item => {
        const isActive = activePalette === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (!isActive) executeInAutoCAD(item.cmd);
            }}
            style={{
              background: isActive ? 'rgba(242,109,33,0.15)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--tmd-orange)' : 'transparent'}`,
              color: isActive ? 'var(--tmd-orange)' : '#888',
              borderRadius: '4px',
              padding: '4px 8px',
              cursor: isActive ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              transition: 'all 0.15s'
            }}
            title={`Abrir ${item.label}`}
          >
            <span>{item.icon}</span>
            <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
