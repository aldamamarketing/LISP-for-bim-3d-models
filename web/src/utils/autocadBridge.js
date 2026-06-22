/**
 * autocadBridge.js
 * Utilidades para comunicarse con el motor JS embebido de AutoCAD.
 * Funciona en paletas HTML nativas (Chromium/CEF).
 * 
 * TODO: Remove or disable all console logs in production environments.
 */

// Diagnóstico inicial del entorno AutoCAD (se ejecuta al importar el módulo)
const _diagAcad = () => {
  try {
    const acadExists = typeof Acad !== 'undefined';
    const editorExists = acadExists && !!Acad.Editor;
    const methods = editorExists
      ? Object.getOwnPropertyNames(Object.getPrototypeOf(Acad.Editor) || {}).concat(Object.keys(Acad.Editor))
      : [];
    console.log('[autocadBridge] Diagnóstico inicial:', {
      acadExists,
      editorExists,
      editorMethods: methods,
      windowExternalType: typeof window.external
    });
  } catch (e) {
    console.warn('[autocadBridge] Error en diagnóstico:', e);
  }
};
_diagAcad();

export const executeInAutoCAD = (cmdStr) => {
  console.log('[autocadBridge] executeInAutoCAD:', cmdStr);



  // Verificar disponibilidad del objeto Acad
  const acadAvailable = typeof Acad !== 'undefined';
  const editorAvailable = acadAvailable && !!Acad.Editor;

  if (!acadAvailable) {
    console.warn('[LC] Objeto Acad NO disponible en window.');
  } else if (!editorAvailable) {
    console.warn('[LC] Acad existe pero Acad.Editor es:', Acad.Editor);
  }

  // Intentar evaluateLisp para expresiones LISP
  if (cmdStr.startsWith('(')) {
    if (editorAvailable && typeof Acad.Editor.evaluateLisp === 'function') {
      try {
        console.log('[LC] Ejecutando via Acad.Editor.evaluateLisp...');
        Acad.Editor.evaluateLisp(cmdStr);
        return true;
      } catch (error) {
        console.warn('[LC] evaluateLisp lanzó error:', error);
      }
    }
  }

  // Fallback: ejecución como línea de comandos (espacio final = Enter)
  // BUGFIX: No añadir espacio ni enter al final, AutoCAD lo añade solo.
  const formattedCmd = cmdStr.replace(/[\\n\\r\\s]+$/, '');

  if (editorAvailable) {
    try {
      if (typeof Acad.Editor.executeCommandAsync === 'function') {
        console.log('[LC] Ejecutando via Acad.Editor.executeCommandAsync...');
        Acad.Editor.executeCommandAsync(formattedCmd);
        return true;
      }
    } catch (error) {
      console.warn('[LC] executeCommandAsync falló:', error);
    }
    try {
      if (typeof Acad.Editor.executeCommand === 'function') {
        console.log('[LC] Ejecutando via Acad.Editor.executeCommand...');
        Acad.Editor.executeCommand(formattedCmd);
        return true;
      }
    } catch (error) {
      console.warn('[LC] executeCommand falló:', error);
    }
  }

  // Fallback: window.external (integraciones .NET antiguas)
  if (typeof window.external !== 'undefined') {
    try {
      if (typeof window.external.ExecuteAutoCADCommand === 'function') {
        console.log('[LC] Ejecutando via window.external.ExecuteAutoCADCommand...');
        window.external.ExecuteAutoCADCommand(formattedCmd);
        return true;
      }
    } catch (e) {
      console.warn('[LC] window.external falló:', e);
    }
  }

  // Diagnóstico: listar propiedades globales relevantes
  try {
    const keys = Object.keys(window).filter(k =>
      k.toLowerCase().includes('acad') ||
      k.toLowerCase().includes('cef') ||
      k.toLowerCase().includes('exec')
    );
    if (keys.length > 0) {
      console.log('[LC] Propiedades globales sospechosas:', keys);
    }
  } catch (e) { /* silenciar */ }

  // ⚠️ NO navegamos con window.location.href — eso destruye el DOM de React
  console.error('[LC] No se encontró ningún método válido para ejecutar comandos en AutoCAD.');
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
    console.error('[LC] Error al cerrar paleta:', e);
  }
  return false;
};
