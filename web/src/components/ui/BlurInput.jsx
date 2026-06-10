import React, { useState, useEffect } from 'react';

export default function BlurInput({ value, onSave, onBlur, onKeyDown, ...props }) {
  const [localVal, setLocalVal] = useState(value || '');

  // Sincronizar el estado local si el valor principal (prop) cambia externamente
  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  const handleBlur = (e) => {
    // Si el texto ha cambiado, llamar a onSave para actualizar la base de datos
    if (localVal !== (value || '')) {
      onSave(localVal);
    }
    // Ejecutar el onBlur original si fue pasado (ej. para cerrar el modo de edición)
    if (onBlur) onBlur(e);
  };

  const handleKeyDown = (e) => {
    // Si se presiona Enter, forzar blur para guardar inmediatamente
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <input 
      {...props}
      value={localVal} 
      onChange={e => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
