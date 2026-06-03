# 🏛️ LispCentral Palette - Arquitectura Funcional 

Este directorio (`__RECOVERY_ARCHIVE`) contiene la última versión estable, testeada y funcional de la Paleta Web que construimos juntos antes de la migración a Astro/React.

Si tu refactorización actual está arrojando errores, duplicando paletas, o quedándose congelada al abrir y cerrar dibujos, es muy probable que alguno de los siguientes **cuatro pilares arquitectónicos** se haya perdido durante la migración.

Aquí explico cómo interactúan estas piezas para que puedas restaurar el equilibrio en tu nuevo código:

## 1. El Patrón Singleton (AutoCAD Blackboard)
**Archivo original:** `loader_logic_recovery.lsp`

**El Problema:** AutoCAD dispara `acaddoc.lsp` (y por ende el comando `CP1`) cada vez que abres un dibujo nuevo. Esto provocaba que AutoCAD intentara inyectar múltiples paletas web, causando solapamiento y pérdida de contexto de la UI.

**La Solución Funcional:** Usar la pizarra global de la sesión LISP (`vl-bb-ref` y `vl-bb-set`). 
Antes de llamar a `_.WEBPALETTE`, el LISP pregunta a la pizarra si la variable `LC_PALETTE_LOADED` existe. 
- Si no existe: La crea, la inyecta, y escribe en la pizarra que ya existe.
- Si existe: **Se detiene inmediatamente.** Ignora el comando de inicialización.

> **💡 Checklist para tu migración:** ¿Mantuvo tu nuevo loader de LISP el chequeo del Blackboard?

## 2. El Event Hub (Reactor de Cambio de Dibujo)
**Archivo original:** `loader_logic_recovery.lsp` -> `palette_unified_recovery.js`

**El Problema:** Como la paleta ahora era un Singleton (una sola para todos los dibujos), si el usuario cambiaba de la pestaña `Dibujo1.dwg` a `Dibujo2.dwg`, el código de la paleta no se enteraba.

**La Solución Funcional:** 
1. Creamos un **Reactor LISP** (`vlr-docmanager-reactor`) que escucha el evento `:vlr-documentBecameCurrent`.
2. Cada vez que cambias de pestaña, el reactor crea un archivo silencioso (`LC_DocEvent.js`) que contiene un gatillo de evento: `window.dispatchEvent(new Event('lc_context_changed'))`.
3. El reactor envía ese JS a todas las paletas web usando `_.WEBLOAD`.
4. El archivo `palette_unified_recovery.js` tiene un `window.addEventListener("lc_context_changed", ...)` que atrapa la señal y recarga los módulos/contexto.

> **💡 Checklist para tu migración:** ¿Tu nueva app en Astro/React está escuchando el evento `lc_context_changed` en el objeto global `window`?

## 3. El Parche del "Zero Doc State" (Manejo de Promesas)
**Archivo original:** `palette_unified_recovery.js` (Función `executeCommandWorker`)

**El Problema:** Si el usuario cierra todas las pestañas de dibujo, la interfaz de AutoCAD sigue mostrándose (sin lienzo). La paleta web queda flotando en el aire. Si el usuario clicaba un comando en la paleta en este estado "Zero Doc", la API de Autodesk devolvía un Error de Código `2`, lo que reventaba la promesa asíncrona de `Acad.Editor.executeCommand()` y congelaba toda la UI silenciosamente.

**La Solución Funcional:**
Envolvimos `Acad.Editor.executeCommand()` en nuestra propia promesa que capturaba los errores con `.catch()`. Si atrapábamos un `err === 2`, sabíamos exactamente qué era, mostrábamos un `alert()` amigable, y **resolvíamos** la promesa para que la interfaz siguiera funcionando en lugar de romperse.

> **💡 Checklist para tu migración:** ¿Tus nuevos hooks o componentes de React están envolviendo las llamadas de Autodesk en bloques `try/catch` o `.catch()`?

## 4. Modo Ribbon Responsivo (CSS Grid / Flexbox)
**Archivo original:** `inspector_unified_recovery.html` y `palette_unified_recovery.js`

**El Problema:** Al anclar la paleta horizontalmente en AutoCAD, se desaprovechaba el espacio. Queríamos que luciera como el Ribbon nativo de AutoCAD (Iconos apilados en columnas de a 3, agrupados en paneles con los títulos en la base).

**La Solución Funcional:**
- Usamos una Media Query de CSS (`@media (min-width: 650px)`).
- El JavaScript (`renderModules`) envolvía dinámicamente cada grupo en un `<div class="ribbon-panel">`.
- Usamos `flex-direction: column-reverse` en CSS para que el título del grupo (`group-header`) se renderizara **abajo** del grupo de herramientas (`group-container`).
- El `group-container` tenía un `max-height` fijo para obligar a los comandos a apilarse en columnas y saltar a la derecha al llenarse.

> **💡 Checklist para tu migración:** ¿Astro/Tailwindcss está emulando los Wrappers (`.ribbon-panel`) y los Flex/Grid layouts correctamente?

---
*Cualquier discrepancia entre este archivo y tu nuevo repositorio es el responsable del fallo. Compara ambas arquitecturas y encontrarás el error.*
