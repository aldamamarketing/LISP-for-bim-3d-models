# Arquitectura: Paletas UI (Dual-Build & AutoCAD Bridge)

El frontend web de este proyecto (ubicado en `web/`) contiene varias interfaces (Paletas HTML5) que son embebidas directamente en AutoCAD mediante Chromium/CEF.

## 1. Dual-Build (Vite + Astro)

Dado que AutoCAD 2019-2022 utiliza un motor de renderizado basado en Chromium v65, el código moderno (operadores Nullish Coalescing `??`, Optional Chaining `?.`, etc.) rompe la UI provocando pantallas blancas. Para solucionar esto sin abandonar Astro, se implementó una estrategia **Dual-Build**:

- **Astro (`astro.config.mjs`)**: Se encarga de empaquetar el sitio web de landing/marketing moderno (`src/pages/*`).
- **Vite/esbuild (`vite.palettes.config.mjs`)**: Se encarga de transpirar exclusivamente los componentes React de las Paletas (`src/palettes-entry/*`) hacia un target rígido de `chrome65`.
  
Ambos builds depositan sus archivos compilados en `dist/` y `dist/palette-builds/` respectivamente, y Firebase Hosting se encarga de rutear las URLs (ej: `/palette` -> `/palette-builds/palette.html`).

## 2. AutoCAD JS API Bridge (`autocadBridge.js`)

Para comunicarse con el entorno LISP desde las paletas HTML, se utiliza la API nativa de AutoCAD.

- **`window.Acad.Editor.evaluateLisp(cmd)`**: Para ejecutar comandos LISP puros (`(C:COMANDO)`).
- **`window.Acad.Editor.executeCommand(cmd)`**: Para inyectar texto directamente en la línea de comandos.

El archivo `autocadBridge.js` abstrae estos métodos y proporciona *fallbacks* automáticos para garantizar que cualquier acción en la interfaz reaccione en AutoCAD.

## 3. UI/UX: Patrón Ribbon y Multi-Filtros

Las paletas (`LispCommandPalette`, `ResourcePalette` y la futura `PropertiesPalette`) comparten las siguientes características de diseño:

- **Top Bar Global:** Un menú de navegación superior con iconos, permitiendo saltar entre las distintas paletas con un solo click enviando el comando LISP correspondiente (`(C:LC)`, `(C:RECURSOS)`, `(C:LC_PROP)`).
- **Grid Layout:** En lugar de listas verticales, los comandos usan `display: grid` con tarjetas cuadradas, ajustándose dinámicamente al ancho para aprovechar el espacio (similar al Ribbon tradicional).
- **Multi-Filtro Persistente:** Se reemplazó el `input` clásico de búsqueda por un sistema de *Tags/Pills* guardado en `localStorage`. Al escribir una palabra y pulsar Enter se crea un "filtro". Los resultados deben coincidir con todos los filtros activos, y estos se recuerdan entre sesiones.
