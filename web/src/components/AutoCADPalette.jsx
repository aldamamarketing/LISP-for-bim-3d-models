import React from 'react';

/**
 * AutoCADPalette — Inspector BIM (Próxima versión)
 * 
 * Esta paleta substituirá los diálogos DCL de AutoLISP por una interfaz moderna,
 * y permitirá convertir objetos CAD nativos en elementos BIM inteligentes
 * con propiedades, materiales y quantitativos gestionables directamente desde la paleta.
 * 
 * Estado: EM DESENVOLVIMENTO
 */
export default function AutoCADPalette() {
  return (
    <div data-build-hash="1782787755" style={{
      backgroundColor: '#181818',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px 20px',
      textAlign: 'center',
    }}>

      {/* Ícone animado */}
      <div style={{
        width: '72px',
        height: '72px',
        marginBottom: '24px',
        position: 'relative',
      }}>
        <svg viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cubo BIM */}
          <path d="M36 8L62 22V50L36 64L10 50V22L36 8Z"
            stroke="rgba(242,109,33,0.3)" strokeWidth="1.5" fill="none" />
          <path d="M36 8L62 22V50L36 64L10 50V22L36 8Z"
            stroke="var(--tmd-orange, #f26d21)" strokeWidth="1.5" fill="none"
            strokeDasharray="120" strokeDashoffset="120"
            style={{ animation: 'draw 2s ease forwards' }} />
          {/* Líneas internas */}
          <line x1="36" y1="8" x2="36" y2="36" stroke="rgba(242,109,33,0.4)" strokeWidth="1" />
          <line x1="10" y1="22" x2="36" y2="36" stroke="rgba(242,109,33,0.4)" strokeWidth="1" />
          <line x1="62" y1="22" x2="36" y2="36" stroke="rgba(242,109,33,0.4)" strokeWidth="1" />
          {/* Punto central */}
          <circle cx="36" cy="36" r="3" fill="var(--tmd-orange, #f26d21)" opacity="0.8" />
        </svg>
      </div>

      {/* Título */}
      <h2 style={{
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#fff',
        margin: '0 0 8px 0',
        letterSpacing: '0.5px',
      }}>
        Inspector BIM
      </h2>

      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(242,109,33,0.1)',
        border: '1px solid rgba(242,109,33,0.35)',
        borderRadius: '20px',
        padding: '4px 12px',
        marginBottom: '20px',
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--tmd-orange, #f26d21)',
          animation: 'pulse 1.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.65rem',
          fontWeight: 'bold',
          color: 'var(--tmd-orange, #f26d21)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          Em Desenvolvimento
        </span>
      </div>

      {/* Descripción */}
      <p style={{
        fontSize: '0.8rem',
        color: '#888',
        lineHeight: '1.6',
        maxWidth: '260px',
        margin: '0 0 24px 0',
      }}>
        Converta objetos CAD nativos em elementos BIM inteligentes. Gerencie
        propriedades, materiais e quantitativos direto na paleta — sem sair do AutoCAD.
      </p>

      {/* Lista de features próximas */}
      <div style={{
        width: '100%',
        maxWidth: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {[
          { icon: '🏗️', label: 'Converter CAD → BIM' },
          { icon: '📐', label: 'Propriedades paramétricas' },
          { icon: '🧱', label: 'Gestão de materiais' },
          { icon: '📊', label: 'Quantitativos automáticos' },
          { icon: '🔗', label: 'Substituição de DCL por UI moderna' },
        ].map(({ icon, label }) => (
          <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#222',
            border: '1px solid #2a2a2a',
            borderRadius: '6px',
            padding: '8px 12px',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '0.85rem' }}>{icon}</span>
            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{label}</span>
          </div>
        ))}
      </div>

      <style>{`
        :root { --tmd-orange: #f26d21; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
