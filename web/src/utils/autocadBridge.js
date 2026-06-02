/**
 * autocadBridge.js
 * Utilidades para comunicarse con el motor JS embebido de AutoCAD.
 * Funciona en paletas HTML nativas (Chromium/CEF).
 */

export const executeInAutoCAD = (cmdStr) => {
  console.log('[autocadBridge] executeInAutoCAD:', cmdStr);

  if (typeof Acad === 'undefined' || !Acad.Editor) {
    console.warn("[LC] Objeto Acad no disponible. Intentando fallback...");
  }

  // Si es un comando puro LISP definido con defun c:XXX
  // lo podemos llamar como LISP (C:XXX)
  if (cmdStr.startsWith('(C:') || cmdStr.startsWith('(LC_')) {
    if (typeof Acad !== 'undefined' && Acad.Editor && typeof Acad.Editor.evaluateLisp === 'function') {
      Acad.Editor.evaluateLisp(cmdStr);
      return true;
    }
  }

  // Fallback a ejecución como si fuera la línea de comandos
  const formattedCmd = cmdStr.endsWith('\n') ? cmdStr : cmdStr + '\n';
  
  if (typeof Acad !== 'undefined' && Acad.Editor) {
    if (typeof Acad.Editor.executeCommandAsync === 'function') {
      Acad.Editor.executeCommandAsync(formattedCmd);
      return true;
    } else if (typeof Acad.Editor.executeCommand === 'function') {
      Acad.Editor.executeCommand(formattedCmd);
      return true;
    }
  }
  
  // Último fallback para versiones antiguas o integraciones .NET
  if (typeof window.external !== 'undefined') {
    try {
      console.log("[LC] Propiedades de window.external:", Object.keys(window.external));
      // Intentar llamar si existe
      if (typeof window.external.ExecuteAutoCADCommand === 'function') {
        window.external.ExecuteAutoCADCommand(formattedCmd);
        return true;
      }
    } catch (e) {
      console.warn("[LC] Error al explorar window.external:", e);
    }
  }

  // Explorar el objeto window buscando inyecciones de AutoCAD
  try {
    const keys = Object.keys(window).filter(k => k.toLowerCase().includes('acad') || k.toLowerCase().includes('cef') || k.toLowerCase().includes('exec'));
    console.log("[LC] Propiedades globales sospechosas de AutoCAD:", keys);
  } catch (e) {}

  // Intento de protocolo acad:
  try {
    console.log("[LC] Intentando protocolo acad: ...");
    window.location.href = "acad:" + cmdStr;
  } catch (e) {}

  console.error("[LC] No se encontró ningún método válido para ejecutar comandos en AutoCAD.");
  
  // Extra Fallback: Copy to clipboard!
  try {
    navigator.clipboard.writeText(cmdStr.trim());
    console.log("[LC] Comando copiado al portapapeles: " + cmdStr);
  } catch (e) {}

  return false;
};

/**
 * Cierra una paleta HTML nativa por su nombre.
 */
export const closePaletteInAutoCAD = (paletteName) => {
  console.log('[autocadBridge] closePaletteInAutoCAD:', paletteName);
  try {
    if (typeof Acad !== 'undefined' && Acad.Application) {
      Acad.Application.removePalette(paletteName);
      return true;
    }
  } catch (e) {
    console.error("[LC] Error al cerrar paleta:", e);
  }
  return false;
};
