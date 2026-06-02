/**
 * autocadBridge.js
 * Utilidades para comunicarse con el motor JS embebido de AutoCAD.
 * Funciona en paletas HTML nativas (Chromium/CEF).
 */

export const executeInAutoCAD = (cmdStr) => {
  console.log('[autocadBridge] executeInAutoCAD:', cmdStr);

  if (typeof window.Acad === 'undefined' || !window.Acad.Editor) {
    console.warn("[LC] Objeto Acad no disponible. ¿Estás dentro de AutoCAD? Comando abortado:", cmdStr);
    // Para depurar en el navegador local, podemos simular la alerta o solo loggear
    return false;
  }

  // Si es un comando puro LISP definido con defun c:XXX
  // lo podemos llamar como LISP (C:XXX)
  if (cmdStr.startsWith('(C:') || cmdStr.startsWith('(LC_')) {
    if (typeof window.Acad.Editor.evaluateLisp === 'function') {
      window.Acad.Editor.evaluateLisp(cmdStr);
      return true;
    }
  }

  // Fallback a ejecución como si fuera la línea de comandos
  const formattedCmd = cmdStr.endsWith('\n') ? cmdStr : cmdStr + '\n';
  
  if (typeof window.Acad.Editor.executeCommandAsync === 'function') {
    window.Acad.Editor.executeCommandAsync(formattedCmd);
    return true;
  } else if (typeof window.Acad.Editor.executeCommand === 'function') {
    window.Acad.Editor.executeCommand(formattedCmd);
    return true;
  } else if (typeof window.external !== 'undefined' && typeof window.external.ExecuteAutoCADCommand === 'function') {
    // Último fallback para versiones muy antiguas o integraciones .NET
    window.external.ExecuteAutoCADCommand(formattedCmd);
    return true;
  }

  console.error("[LC] No se encontró ningún método válido para ejecutar comandos en AutoCAD.");
  return false;
};

/**
 * Cierra una paleta HTML nativa por su nombre.
 */
export const closePaletteInAutoCAD = (paletteName) => {
  console.log('[autocadBridge] closePaletteInAutoCAD:', paletteName);
  try {
    if (typeof window.Acad !== 'undefined' && window.Acad.Application) {
      window.Acad.Application.removePalette(paletteName);
      return true;
    }
  } catch (e) {
    console.error("[LC] Error al cerrar paleta:", e);
  }
  return false;
};
