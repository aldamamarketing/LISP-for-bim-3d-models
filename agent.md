# TM Digital (TMD) - Agent Knowledge Base

## Estado del Proyecto (Versión 5.0)
El proyecto se encuentra en plena transición a la arquitectura de **Sólidos Independientes** (Versión 5.0). 
Se ha abandonado el concepto de `TMD_PARENT_WIRE` y polilíneas base ("Wires"). Ahora, cada viga o columna es un Sólido 3D (`3DSOLID`) independiente que contiene todo su "ADN" inyectado en la estructura de LDATA.

### Reglas de Arquitectura V5:
1. **No hay líneas base (Wires):** La geometría se genera directamente extrudiendo perfiles o usando operaciones booleanas en el motor geométrico.
2. **Generación al vuelo:** Si un sólido necesita ser justificado, alineado o reconstruido, se elimina el sólido existente y se dibuja uno nuevo usando el LDATA guardado.
3. **LDATA (El ADN):** 
   - **SE DEBE EVITAR** almacenar el punto de inicio (`PT_A`), el punto final (`PT_B`) o la longitud fija en el LDATA. Esto permite que el usuario modifique la longitud del sólido manualmente en AutoCAD (usando grips) sin que los datos se corrompan.
   - Campos Clave Inyectados: `FORMA`, `DIM_X`, `DIM_Y`, `ESPESSURA`, `LABIO`, `MATERIAL`, `JUSTIFICACAO`, `ROTACAO`.
4. **Identidad Persistente (TMD_UUID / Handle Shadowing):**
   - Se usa `TMD_UUID` para rastrear sólidos idénticos en la base de datos de BOM.
   - **Manejo de Clones:** Si al inspeccionar un sólido, su Handle de AutoCAD es diferente al `TMD_HOST_HANDLE` almacenado en LDATA, se considera un clon (copiado nativamente). Se le genera automáticamente un `TMD_UUID` nuevo.

---

## Organización del Repositorio (Reestructuración Física)
El código AutoLISP corporativo está organizado estrictamente por disciplinas bajo las siguientes carpetas:

* **`Suite_Sistema_Core/`**: Configuración de inicio, utilidades globales, cargadores dinámicos y puentes de paleta (`TM_SetupCore.lsp`, `TM_Setup.lsp`, `TMD_Utils.lsp`, `TMD_Palette_Bridge.lsp`).
* **`Suite_Arquitectura/`**: Comandos y herramientas para modelado arquitectónico 2D/3D (`ParedeMVP.lsp`, `PortaMVP.lsp`, stubs de la suite `ARQ-`, etc.).
* **`Suite_Estructura/`**: Perfiles metálicos, abas paramétricas, cálculo de grelhas, vigas y compiladores (`TMD_Vigas.lsp`, `TMD_Abas.lsp`, `TMD_BUILD.lsp`, `TMD_JOINTS.lsp`, etc.).
* **`Suite_Topografia/`**: Cuadros de rumbos, etiquetas de nivel Z y herramientas de topografía (`LC_CUADRO_RUMBOS.lsp`, `LC_ZLABEL.lsp`).
* **`Suite_Instalaciones_MEP/`**: Carpeta destinada para futuros desarrollos de redes hidráulicas, eléctricas y climatización.
* **`Suite_Documentacion_BOM/`**: Generación de tablas de materiales, marcas dinámicas de nivel y sincronizadores (`TMD_BOM.lsp`, `TMD_Tablas.lsp`, `TMD_Tags.lsp`, `TMD_Niveis.lsp`, `TMD_MATCH.lsp`, `TMD_SYNC.lsp`).

---

## Arquitectura de Carga SaaS — Stubs + JIT Loading (v3.5)

El sistema usa un modelo **JIT (Just-In-Time)** donde el código LISP se descarga bajo demanda del servidor en la nube de forma transparente y sin almacenamiento físico en el disco del usuario (Zero-Disk).

### Flujo de Ejecución de Comandos JIT:
1. El usuario hace click en una tarjeta de la paleta HTML o escribe un comando fantasma en el AutoCAD (ej: `ARQ-WALL-Draw`).
2. AutoCAD intercepta el comando y ejecuta `(LC:run-or-load "ARQ-WALL-Draw")`.
3. Si el comando no se encuentra cargado en memoria, hace un fetch GET al servidor Cloud Run: `https://getroutine-wgpjjgorxa-uc.a.run.app/getRoutine?apiKey=...&routine=ARQ-WALL-Draw`
4. El servidor procesa el archivo `.lsp` de `functions/lisp/`, remueve comentarios, envuelve el código en un bloque `(progn ...)` y lo retorna como texto plano.
5. AutoCAD evalúa el código de forma segura en RAM (`eval`), registrando el comando real e invocándolo.

---

## Suite de Arquitectura 2D (Comandos ARQ-)
Los comandos de arquitectura 2D utilizan una firma semántica bajo el formato: `ARQ-[Sistema]-[Descriptivo]`. 

### Listado de Comandos de la Suite:
- **`ARQ-SYS-Config`**: Configuración de capas, unidades de dibujo y escalas operativas.
- **`ARQ-GRID-Axes`**: Generación de rejillas de ejes paramétricas (X e Y).
- **`ARQ-GRID-Line`**: Trazado y etiquetado individual de un eje de referencia.
- **`ARQ-WALL-Draw`**: Dibujo interactivo de muros paralelos con espesor dinámico.
- **`ARQ-WALL-FromAxis`**: Conversión instantánea de ejes seleccionados en muros 2D.
- **`ARQ-WALL-Thickness`**: Cambio de espesor global para muros existentes seleccionados.
- **`ARQ-WALL-Trim`**: Limpieza de encuentros y esquinas de muros en L, T o Cruz.
- **`ARQ-COL-Insert`**: Colocación paramétrica de pilares redondos o rectangulares.
- **`ARQ-DOOR-Insert`**: Inserción de puertas batientes o correderas con rotura automática de muro.
- **`ARQ-WIN-Insert`**: Inserción de ventanas con antepecho y corte automático de muro.
- **`ARQ-WALL-MoveOpening`**: Desplazamiento interactivo de vanos de puertas/ventanas reconstruyendo el muro.
- **`ARQ-WALL-ResizeOpening`**: Cambio de dimensión de vanos de esquadria recalculando la apertura en muros.
- **`ARQ-DIM-Opening`**: Acotado lineal automático y secuencial de muros y esquadrias.
- **`ARQ-DIM-Quick`**: Acotado rápido y acaparador de las cotas internas de un ambiente.
- **`ARQ-SYM-Level`**: Inserción de simbología de nivel de piso con textos editables.

---

## Paleta de Propiedades Contextuales Dinámicas

Actualmente, el esqueleto (UI) está preparado e integrado en el entorno de producción (`web/src/palettes-entry/properties-palette.jsx`) a través del sistema **Dual-Build** de Vite (target `chrome65`). La paleta cuenta con el componente `PaletteNavBar` para cambiar rápidamente a las otras paletas usando comandos LISP transparentes (`(C:LC)`, `(C:RECURSOS)`, `(C:LC_PROP)`). Esto deja la plataforma 100% lista para programar la lógica del Inspector (detectar objetos seleccionados, modificar parámetros, etc.) sin preocuparse por la compatibilidad de Chromium.### Scaffolding (Fase 1 - Dual Build)


### Sincronización Bidireccional (IPC):
1. **AutoCAD -> Web (Detección de Comando)**:
   - Cuando un comando LISP `ARQ-...` se ejecuta, escribe su estado en la variable de sistema `USERS1` en el formato `[Comando]:active` (ej: `ARQ-WALL-Draw:active`).
   - El JavaScript de la paleta realiza un sondeo continuo (polling de 250ms) de la variable `USERS1`. Al detectar el comando, activa automáticamente el formulario HTML correspondiente.
   - Al terminar el comando LISP, escribe `[Comando]:success` o limpia la variable, lo cual retorna la paleta al estado de espera.
2. **Web -> AutoCAD (Envío de Propiedades)**:
   - Cada formulario web almacena los valores de sus parámetros de forma persistente en el `localStorage` del navegador.
   - Cuando un usuario edita un parámetro en la web, el JavaScript evalúa dinámicamente una expresión de definición de variables globales en la memoria del AutoCAD utilizando `Acad.Editor.evaluateLisp` (ej: `(setq ARQ_WALL_Draw_thickness 150.0)`).
   - Los stubs LISP de los comandos leen directamente estas variables globales para tomar los datos geométricos del formulario en tiempo de ejecución.

---

## Arquitectura de Paletas Web: Singleton + Event Hub
Para manejar mltiples paletas (Comandos, Propiedades, IA) sin problemas de duplicacin o superposicin de estado al cambiar de pestaa en AutoCAD (Zero Doc State / Context Switching), el sistema utiliza una arquitectura basada en **Singleton y Event Hub**:

### 1. Inicializacin Singleton (LISP Blackboard)
* El loader local evala `(vl-bb-ref 'LC_PALETTE_LOADED)` al arrancar.
* **AutoStart Silencioso:** Si un dibujo nuevo se abre y la sesin ya existe, el LISP no hace llamadas a `Acad.Application.addPalette()`. Evita duplicacin de pestaas.
* **Arranque Manual:** El comando explcito `LC_INSPECT` evade la restriccin del Blackboard para permitir al usuario **volver a abrir o enfocar** la paleta si la cierra manualmente (con la 'X'), pasando la misma URL constante.

### 2. Event Hub (Reactores y Mensajera)
* LISP inicializa un `vlr-docmanager-reactor` que escucha `:vlr-documentBecameCurrent` (cambio de dibujo).
* Al cambiar de dibujo, LISP inyecta dinmicamente un pequeo script (`WEBLOAD`) que despacha el evento global de JavaScript: `window.dispatchEvent(new CustomEvent('lc_context_changed'))`.
* Las paletas estn subscritas a este evento y lo utilizan para vaciar y refrescar su estado (ej: limpiando las propiedades mostradas del dibujo anterior o refrescando el contexto del agente IA) de forma segura y sin recargar el panel entero.

---

## Infraestructura y Despliegues en Producción
* **Timeout de Análisis Local (Firebase CLI en Windows):**
  Si el comando `firebase deploy` falla con el error `Timeout after 10000. Cannot determine backend specification`, **NUNCA** recurras a desplegar individualmente con `gcloud`. Este error ocurre porque importar `firebase-admin` es muy pesado en Windows y el CLI aborta el análisis local tras 10 segundos.
  **La Solución Definitiva:**
  1. Utiliza siempre **lazy-loading** para la inicialización de `firebase-admin` (por ejemplo, encapsulándolo en una función `getAdmin()` en `index.js` que solo se invoque bajo demanda). Esto hace que el archivo cargue al instante y el comando de Firebase ya no fallará.
  2. Adicionalmente, puedes aumentar el timeout temporalmente desde la terminal antes de desplegar:
  ```powershell
  $env:FUNCTIONS_DISCOVERY_TIMEOUT=60; npx -y firebase-tools@latest deploy --only functions
  ```
  3. **Deploy Selectivo**: Para evitar problemas de timeout en despliegues completos del backend, es recomendable desplegar únicamente la función requerida (ej. `getRoutine` para AutoLISP):
  ```powershell
  npx firebase-tools deploy --only functions:getRoutine
  ```
* **Enrutamiento del Backend:**
  El enrutamiento del backend (`functions/index.js`) ha sido modificado en su regex de saneamiento para admitir guiones medios (`-`), lo que permite que las peticiones a comandos de formato `ARQ-...` se validen y entreguen correctamente.
* **Flujo de Build & Deploy Automático (Resource Palette):**
  Para generar y sincronizar la paleta de recursos local en desarrollo y producción:
  1. **Build e Integración**: Compilar la paleta web. El plugin `syncToDistPlugin` en Vite copiará el bundle HTML automáticamente de `public/palette-builds/` a `dist/palette-builds/`:
     ```powershell
     cd web
     npx vite build --config vite.resource-palette.config.mjs
     ```
  2. **Deploy Hosting**: Publicar los archivos HTML y recursos estáticos actualizados a Firebase Hosting:
     ```powershell
     cd ..
     npx firebase-tools deploy --only hosting
     ```

---

## 🚀 Evolución a Plataforma SaaS Multi-Tenant (B2C a B2B)
El proyecto ha pivotado hacia un modelo Híbrido:
*   **Fase 1 (B2C):** TM Digital actúa como "Tenant 0", ofreciendo sus LISPs por suscripción a dibujantes individuales.
*   **Fase 2 (B2B SaaS):** La plataforma se abre para que empresas (Tenants corporativos) alojen sus propios códigos LISP, gestionen llaves de acceso para sus dibujantes y protejan su IP.

### Reglas Técnicas Obligatorias (Qué haremos y Cómo):
1.  **Multi-Tenant desde el Día 1:** Toda la base de datos (Firebase) y lógica de backend asume que existen múltiples empresas. Todo está ligado a un `tenant_id`. No hay refactorización futura.
2.  **IDs Semánticos:** Queda estrictamente prohibido usar UUIDs aleatorios (ej. `a1b2c3d4`) para identificar tenants, usuarios o rutinas en Firestore. Se usarán IDs descriptivos (ej. `tenant_tmdigital`, `lisp_viga_mvp`). **¿Por qué?** Facilita la depuración manual y mantiene la legibilidad semántica del diseño.
3.  **Seguridad Online-Only:** Durante la Fase Beta, la plataforma funcionará online. Cada comando consulta al servidor. **No** se implementarán tokens JWT offline temporales. **¿Por qué?** Para garantizar la protección total de la Propiedad Intelectual hasta implementar un cifrado cliente-servidor nativo sólido.
4.  **Cifrado SaaS Estándar:** Usamos encriptación en tránsito (HTTPS) y en reposo (Firebase/GCP). La ofuscación profunda queda de lado de la empresa (pueden subir `.fas` o `.vlx` a su bucket si desconfían del texto plano).
5.  **Desnormalización NoSQL (Performance):** Las relaciones complejas (ej. Suites a Archivos LISP) NUNCA deben resolverse con queries encadenadas relacionales en Cloud Functions de alto tráfico. Deben desnormalizarse (ej. inyectar un array `suiteIds` en `lispFiles`) mantenidos por **Firestore Triggers** (`onDocumentWritten`). Esto garantiza consultas O(1) de baja latencia cuando AutoCAD arranca.

### Estado Actual del Dashboard Web (SaaS Console)
El Dashboard web (React + Firebase + Astro) se ha reestructurado para operar como una consola SaaS profesional y "Mobile Friendly". Se aplicaron las siguientes decisiones arquitectónicas UI/UX y de código:
*   **Modularización React (Refactorización):** El monolito histórico `Dashboard.jsx` (>1200 líneas) fue dividido en componentes granulares bajo `src/components/dashboard/` (`AuthLogin`, `ProfileTab`, `LicensesTab`, `LispManagerTab`, `SupportModal`).
*   **State Management Global:** Se implementó el patrón React Context API (`DashboardContext.jsx`) para gestionar el estado global (`userData`, `tenantLisps`, `seats`, etc.) y evitar el "prop-drilling", garantizando escalabilidad pura y mantenibilidad a largo plazo.
*   **Estrategia i18n Híbrida:** Todo el entorno aplica diccionarios globales (`translations.js`). Para páginas públicas con SEO (`/`, `/help`, `/privacy`, `/terms`), se usa enrutamiento estático de Astro (`/[lang]/`). Para la SPA privada (`/dashboard`, `/login`), se usa `localStorage` leyendo y traduciendo en cliente para mantener URLs limpias y prevenir errores 404.
*   **Navegación Unificada:** Se consolidó la estructura bajo un Sidebar Universal (`DocsLayout`), eliminando menús desplegables redundantes y ofreciendo un flujo de trabajo continuo entre la plataforma pública y el área logueada, al estilo de aplicaciones SaaS modernas.
*   **Jerarquía Visual y Micro-Animaciones:** Priorización de *Assinatura & Licenças* y *Workspace LISPs*. Se integraron estados `focus-visible`, efectos `hover` (`hover:-translate-y-1`), transiciones suaves en el cambio de pestañas (`tab-enter`) y un observador de intersección global (`revealObserver`) para lograr un aspecto premium.
*   **God Mode (Beta):** Los Beta Testers pueden incrementar sus asientos (`seats`) directamente desde el dashboard sin pasar por la pasarela de Stripe. Esta acción actualiza `maxSeats` en la base de datos instantáneamente.
*   **Workspace Inteligente:** Los archivos cargados en la nube se ordenan automáticamente de forma alfabética por *Suite*, luego por *Grupo* y finalmente por *Nombre Amigable*. Soporta carga masiva y vinculación de iconos SVG dinámicos.
*   **Centro de Soporte:** Incluye un menú interactivo en la cabecera para "Reportar Bug" (conectado directamente a la colección `feedback` de Firestore) y una sección de FAQ desplegable en la landing page.
*   **IDs Semánticos en Firestore:** La carga de rutinas LISP utiliza `setDoc` para forzar la creación de documentos en `lispFiles` con IDs predecibles y semánticos (`lisp_[tenantId]_[lispId]`).
*   **Desbloqueo de Custom Suites:** El backend (Cloud Run) ahora permite que la paleta nativa recupere absolutamente todos los LISPs pertenecientes al `tenantId` del usuario activo, ignorando el filtro restrictivo de `activeSuites`.

---

## 🎨 Herramientas para Desarrolladores (Icon Factory AI)
Para acelerar la creación de comandos en la plataforma B2B, se migró el stack web a **Astro + React** y se incorporó un **Generador de Iconos IA**:
* **Gemini-Flash-Latest:** Se utiliza Firebase Functions + `GoogleGenerativeAI` para generar SVGs técnicos al vuelo a partir de nombres de comandos (ej: *Acotar muro*). Genera 3 variaciones exactas con trazos finos y sin bordes redondeados.
* **Empaquetado Nativo:** El frontend empaqueta los SVGs seleccionados utilizando `JSZip` y la API de `Canvas` de HTML5 para renderizar los iconos a PNG (16x16 y 32x32) tanto en Dark Theme como en Light Theme de manera local, forzando la descarga del `.zip` listo para integrar en el CUIx de AutoCAD.
* **Estilos CSS Dinámicos:** Los SVGs devueltos por la IA utilizan `currentColor` y `var(--icon-accent)`. Esto permite previsualizar los modos claros y oscuros, e inyectar el color de acento corporativo directamente desde un color picker de React sin tener que volver a llamar a la API.

---

## 🎨 Guías de Diseño de Interfaz Web (Web Interface Guidelines)
*Implementado a partir del skill de Vercel (web-design-guidelines).*
- **Accesibilidad (A11y):** Asegurar contrastes adecuados, usar etiquetas semánticas (`aria-label`) y mantener estados de `focus-visible` en elementos interactivos. Reemplazar `divs` clickeables por botones semánticos (`<button>`).
- **Responsividad:** Los contenedores principales (como Footer o layouts de Blog) deben usar anchos máximos (`max-width: 1200px`), márgenes fluidos (`margin: 0 auto`) y reflows en móvil (`@media (max-width: 768px)`).
- **Legibilidad:** Limitar el ancho máximo de bloques de texto grandes (ej. max-width 800px para artículos) para prevenir fatiga visual.

---

## 🚀 Mejores Prácticas para Agentes en Astro (Frontend "Iron Laws")
*Instrucciones técnicas obligatorias al trabajar con el stack frontend en Astro.*
1. **Priorizar Componentes estáticos (`.astro`):** Usar siempre `.astro` para UI estática. Los frameworks de UI (React) quedan estrictamente reservados para las "islas interactivas".
2. **Hidratación Explícita:** Declarar explícitamente el uso de JS en el cliente (usando `client:load`, `client:idle`, `client:visible`). Nunca cargar JS de cliente por defecto.
3. **Colecciones Type-Safe:** Administrar datos estructurados (ej. Blog) con `Content Collections` y `zod`. Prohibido el uso nativo de `Astro.glob()` para posts y colecciones.
4. **Imágenes Optimizadas:** Restringir el uso de la etiqueta nativa `<img>`. En su lugar, obligar el uso de `astro:assets` (`<Image />`) para redimensionar, convertir formato a WebP/AVIF y cuidar el LCP de la página.
5. **Rendimiento:** Entregar CERO JavaScript por defecto. Cualquier KB de JS que vaya al navegador debe tener una justificación de UI.
6. **Integraciones seguras:** Usar `npx astro add [tool]` al integrar librerías para evitar configuraciones manuales propensas a error en `astro.config.mjs`.

---

## 📚 Ecosistema de Biblioteca Global y Paleta AutoCAD
*El sistema ha evolucionado de "Generación Bajo Demanda" a un "Catálogo Curado Estático + JIT Load".*

### 1. Arquitectura de Datos del Catálogo (v2)
- **Catálogo ligero (JSON estático en Hosting):** `web/public/api/hatch-catalog.json` y `lin-catalog.json`.
  - Contiene solo: `id`, `name`, `desc`, `category`, `icon` (SVG string).
  - **NUNCA** incluye el campo `code` (.pat/.lin) — protección de IP.
  - Se genera con `node functions/scripts/buildHatchCatalog.mjs` y se sube via `firebase deploy --only hosting`.
- **Código individual (Firestore JIT):** `publicAssets/{id}` con campo `code`.
  - Se descarga bajo demanda **solo al insertar** en AutoCAD (1 read Firestore por uso).
- **Cache de sesión (RAM LISP):** `*LC-ASSET-CACHE*` — lista asociativa en RAM. Evita re-descarga del mismo patrón en la misma sesión de AutoCAD.
- **Cache cliente (localStorage TTL 1h):** El catálogo ligero se guarda localmente para aperturas posteriores de la paleta sin costo de red.

### 2. JIT Loading de Assets (3 Niveles)
Al hacer clic en "Insertar" en la ResourcePalette:
1. **Nivel 1 — Dibujo:** ¿El patrón ya existe en el dibujo? Aplicar directo.
2. **Nivel 2 — Sesión LISP:** ¿`(assoc nombre *LC-ASSET-CACHE*)` existe? Escribir temp y aplicar.
3. **Nivel 3 — Cloud:** Fetch de `publicAssets/{id}` campo `code` → decodificar Base64 → registrar en `*LC-ASSET-CACHE*` → escribir temp y aplicar.

### 3. Administración del Catálogo (Admin Only)
- **Solo** `aldamadaniel1984@gmail.com` puede agregar/eliminar entradas al catálogo.
- Panel disponible en `/dashboard#catalog-admin` → tab `CatalogAdminTab.jsx`.
- Al guardar, ejecutar el script de regeneración del JSON estático y hacer deploy.
- IDs semánticos: `hatch_architecture_brick_stretcher` (formato: `{type}_{category}_{name}`).

### 4. Pauta de Multi-Idioma para Escritores de LISP
La plataforma provee la **estructura** para multi-idioma. El programador elige implementarla o no.

**Convención estándar de LispCentral (opcional para el escritor):**
```lisp
(princ "\n[LC] Hatch aplicado com sucesso!")   ;;[lang:pt]
(princ "\n[LC] Hatch aplicado con éxito!")     ;;[lang:es]
(princ "\n[LC] Hatch applied successfully!")   ;;[lang:en]
```
- El backend (`getRoutine`) leerá el parámetro `?lang=pt|es|en` y el script de preprocessing filtrará solo los `(princ)` del idioma solicitado antes de servir el código.
- Si el archivo no tiene bloques `;;[lang:]`, se sirve sin modificación (compatibilidad total con LISPs existentes).

### 5. Ghost Command: LC_APPLY_ASSET y Bridge Seguro (Inyección sin Base64)
El `ResourcePalette` usa el patrón bridge de dos canales para inyectar recursos (patrones `.pat` o `.lin`) en AutoCAD de forma silenciosa y evitar el bug de repetición de comandos.

Inicialmente se usó codificación Base64, pero resultó en bugs matemáticos en LISP y corrupciones de texto. La solución definitiva (Implementada en v5) consiste en:
1. Escapar de forma nativa los caracteres problemáticos en JS (`\n` -> `\\n`, `"` -> `\\"`).
2. Cortar el texto **antes** de escapar en "chunks" de 100 caracteres. Esto previene que se parta un carácter de escape por la mitad (lo que colgaría AutoCAD con errores de sintaxis tipo `((("_>`).
3. Inyectar silenciosamente envolviendo con `(progn ... (princ))` para suprimir el molesto eco en la consola de AutoCAD.

```js
// Canal 1 (evaluateLisp): inyección silenciosa y segura en RAM LISP
executeInAutoCAD(`(setq *LC-ASSET-TYPE* "hatch")`);
executeInAutoCAD(`(setq *LC-ASSET-NAME* "BRICK_45")`);
executeInAutoCAD(`(setq *LC-ASSET-CODE* "")`);
// Chunking iterativo para evadir el límite de 256 chars del buffer de comandos:
executeInAutoCAD(`(progn (setq *LC-ASSET-CODE* (strcat *LC-ASSET-CODE* "chunk1_escapado")) (princ))`);
// ...

// Canal 2 (executeCommandAsync): disparo del Ghost Command limpio
executeInAutoCAD('LC_APPLY_ASSET');
```
- El Ghost Command `c:LC_APPLY_ASSET` lee las variables, verifica si el patrón ya incluye un encabezado `*` (para no duplicarlo, lo que causaría `Bad pattern definition file`), escribe el `.pat`/`.lin` temporal en `%TEMP%\LC_Assets\`, agrega la ruta al ACAD search path, y limpia las variables globales.
- Al escribir el temporal (con modo `"w"`), siempre se sobreescribe, garantizando cero acumulación de basura y que AutoCAD lea siempre la versión más actualizada de Firebase.

#### 💡 Resoluciones Críticas de la Resource Palette en AutoCAD (Junio 2026):
* **Bypass de URLs de SVG Relativas (`file://`):**
  Debido a que la paleta cargada dentro de AutoCAD requiere ser un archivo local (`file:///...LC_Resource.html`) para evitar el sandbox HTTPS y habilitar `execAsync`, los recursos relativos `/patterns/*.svg` fallaban con error `ERR_FILE_NOT_FOUND` al resolverse como `file:///C:/patterns/*`.
  **Solución:** Se exportó la constante `ASSETS_BASE_URL = 'https://lispcentral.web.app'` desde `HatchEngine.js` y se reconstruyeron dinámicamente las URLs absolutas en `ThumbnailPreview.jsx`, `SvgPreviewEngine.jsx` y `HatchGenerator.jsx`.
* **CORS en Firebase Hosting:**
  Las peticiones `fetch()` a la URL del hosting de producción desde el origen local `file://` dentro de AutoCAD fallaban por restricciones de CORS.
  **Solución:** Se añadieron headers de CORS (`Access-Control-Allow-Origin: *` y `Access-Control-Allow-Methods: GET`) en `firebase.json` bajo la regla de source `/patterns/**`.
* **Mismatch de Nombre en `setvar "HPNAME"` (PAT Autogenerados):**
  AutoCAD requiere que el nombre asignado a la variable de sistema `HPNAME` coincida exactamente con el nombre de la cabecera dentro de su correspondiente archivo `.pat`. En el Generator, los patrones autogenerados inyectan cabeceras descriptivas complejas como `*Herringbone_50x260_J0`, pero el LISP intentaba buscar y aplicar `HERRINGBONE_50` (un mismatch que provocaba el rechazo de `HPNAME`).
  **Solución:** Se editó `core_engine.lsp` para que si el código PAT inicia con `*`, extraiga el nombre real del patrón definido tras el asterisco y antes de la primera coma, utilizándolo en `HPNAME`.
* **Registro Inmediato en AutoCAD Search Path y Fix de `vl-catch-all-apply`:**
  * Se corrigió el bug de `vl-catch-all-apply` en `core_engine.lsp` que carecía del segundo argumento de lista de argumentos (ej. `'()`). Sin este argumento obligatorio, la lambda de registro fallaba de manera silenciosa en LISP.
  * Se migró la asignación de la ruta temporal de `setenv "ACAD"` a `vla-put-SupportPath` vía ActiveX:
    ```lisp
    (vla-put-SupportPath 
      (vla-get-Files (vla-get-Preferences (vlax-get-acad-object)))
      nuevoPath
    )
    ```
    Esto agrega el directorio de hatches temporales al search path de AutoCAD de forma inmediata en caliente sin necesidad de reiniciar el programa.

---

## 🚨 ARQUITECTURA DE PALETAS WEB Y COMUNICACIÓN LISP ↔ JS

A lo largo del proyecto, enfrentamos problemas críticos al intentar comunicar las Paletas Web (React) con AutoCAD, específicamente el error `exec is not defined` al intentar enviar comandos desde el navegador hacia AutoCAD.

### 1. El Problema (AutoCAD 2021 y el Sandbox HTTPS)
AutoCAD 2021 (y versiones posteriores) utiliza un motor Chromium (CEF/WebView2) para sus paletas. Para que el JavaScript de la paleta pueda enviar comandos a AutoCAD, el motor inyecta un puente nativo invisible (las funciones `exec` o `execAsync`).

**El bloqueo de seguridad:** Si AutoCAD carga una paleta desde una URL remota (`https://lispcentral.web.app/...`), por motivos de seguridad **se niega a inyectar el puente**. Esto causaba que la API oficial (`Autodesk.AutoCAD.js`) crasheara con `exec is not defined`.

### 2. La Solución Actual: Paleta de Archivo Local (Single-File HTML)
Para evadir el bloqueo de seguridad, la regla de oro es: **AutoCAD solo confía en archivos locales (`file:///`)**.

**¿Dónde está la paleta actualmente en desarrollo?**
1. Usamos Vite (en la carpeta `web/`) para compilar todo el proyecto de React en **un único archivo HTML independiente** (Single-File Build) sin dependencias externas.
2. Ese archivo se genera en: `Z:\Autocad Config\LISP\web\public\palette-builds\palette.html`.
3. El comando `CP1` (definido en `LC_Loader.lsp`) le dice a AutoCAD que cargue la paleta **apuntando directamente a ese archivo local** en tu disco Z:.
4. Al ser un archivo local, AutoCAD 2021 "confía" en él y **sí inyecta** `execAsync`. React ahora puede hablar con AutoCAD libremente.

**¿Cómo es el flujo SaaS End-to-End para el Usuario Final?**
El sistema opera bajo una arquitectura 100% *Serverless*, *Zero-Disk-Install* y con protección total de la Propiedad Intelectual:

1. **Dashboard & Configuración:** El cliente inicia sesión en la web-app y sube/configura sus archivos `.lsp`.
2. **Indexación Backend:** El servidor de LispCentral procesa y actualiza la base de datos de rutinas (el `INDEX`) para ese usuario.
3. **Descarga Dinámica:** El cliente hace clic en "Descargar Loader". El backend inyecta los tokens únicos del cliente (`*TMD-SEAT-TOKEN*`) en el `loader_template.lsp`, lo compila y le entrega el Loader final.
4. **Carga en AutoCAD:** El cliente arrastra el Loader a AutoCAD (no necesita configurar rutas ni instalar nada en su disco duro).
5. **Magia JIT y UI:**
   - AutoCAD lee el Loader.
   - El Loader descarga la Paleta React compilada (el HTML) desde Firebase directamente a su carpeta temporal `%TEMP%\LC_Palette.html`.
   - La Paleta lee el `INDEX` del servidor y dibuja los botones con los comandos del cliente.
   - El Loader registra silenciosamente "Comandos Fantasmas" (Stubs) en la RAM de AutoCAD.
6. **Ejecución Protegida:** Al hacer clic en un botón de la paleta, AutoCAD dispara el Comando Fantasma. Este comando descarga en un milisegundo el código LISP real desde el servidor a la RAM y lo ejecuta. El LISP nunca toca permanentemente el disco duro del cliente.

### 3. Reglas Estrictas para el Envío de Comandos (autocadBridge.js)
Incluso con la paleta funcionando localmente, descubrimos bugs severos al comunicarnos con la API `executeCommandAsync`. **Todo Agente de IA debe seguir estas reglas al modificar la UI:**

- **NUNCA envíes expresiones LISP a la línea de comandos:**
  Si envías `(LC:run-or-load "Muro")` vía JS, AutoCAD 2021 lo evalúa asíncronamente. Si esa evaluación termina sin interacciones visuales, AutoCAD emite un salto de línea en blanco al final. Ese salto de línea **repite el último comando interactivo que el usuario haya usado** (causando que el comando `LINE` u otros se activen solos e infinitamente).
  
- **SIEMPRE envía el Alias del Comando LISP:**
  En React, llama a `executeInAutoCAD("ARQ-SYS-Config");`. 
  AutoCAD lo procesará limpiamente porque es el nombre de un "Ghost Command" (registrado previamente por LISP mediante `LC:register-ghosts`).
  
- **NUNCA añadas espacios ni `\n` al final en JavaScript:**
  AutoCAD inyecta automáticamente el Enter necesario. Si en JS hacemos `cmdStr + ' '`, AutoCAD recibirá dos instrucciones de terminación, causando doble ejecución o repetición de comandos. `autocadBridge.js` ya está configurado con una Regex para podar cualquier espacio residual (`.replace(/[\\n\\r\\s]+$/, '')`).

---

## 🚀 Future Planned Features

### Parametric Hatch Builder (ARTX Style)
- **Objective**: A new tab in the palette to generate custom vector hatch patterns (.pat) dynamically without images or colors, purely mathematical.
- **UI Design**: Inspired by Architextures (Glassmorphism, clean panels, modern floating UI with inputs and sliders).
- **Inputs**: Width, Height, Gap/Joint size, Angle, Pattern Type (Stack, Stretcher, Herringbone, Wood, etc).
- **Preview**: Real-time SVG vector rendering of the hatch in the palette before insertion (60fps, no server lag).
- **Execution**: Clicking 'Insert' calculates the `.pat` mathematics entirely in JavaScript on the client side, base64 encodes it, and uses the `LC_APPLY_ASSET` Ghost Command / JIT flow to apply it directly in AutoCAD with zero server processing cost.

## 🚀 Logros Recientes (Núcleo Funcional B2B)
El núcleo de la plataforma SaaS (LispCentral B2B) ha sido estabilizado y testeado exitosamente en producción:
- **Desnormalización NoSQL:** Se eliminaron consultas anidadas costosas introduciendo `suiteIds` inyectados asíncronamente vía Triggers (Firestore) en `lispFiles`, logrando respuestas instantáneas en la API `INDEX`.
- **Live Sync & JIT Garbage Collection:** Al hacer click en "Sync" desde la paleta, AutoCAD envía internamente el comando nativo `LC_SYNC`. Esto elimina de la memoria LISP (`undefine`) los comandos a los que el usuario ya no tiene acceso, vacía la caché JIT y fuerza la regeneración estricta de permisos en cuestión de milisegundos sin necesidad de reiniciar la sesión de trabajo.

## 🔮 Roadmap (Fase 2 - Optimizaciones B2B y Performance)
La Fase 2 se enfocará en optimizar payloads y modernizar la gestión de activos nativos de AutoCAD:

1. **Desnormalización Profunda de Comandos:** Mover la estructura de comandos (Name, Desc, Icon) adentro de `lispFiles`. Esto simplificará drásticamente la API `INDEX`, eliminando pasos innecesarios.
2. **Optimización Extrema de SVGs:** Reemplazar el inyectado de SVGs literales en el JSON por un sistema de `iconId` (diccionarios), reduciendo dramáticamente el peso de red y el consumo de memoria en AutoCAD.
3. **Contexto Visual de Grupos en el Payload:** Inyectar los nombres amigables de los grupos directamente en la carga que va a AutoCAD. Esto permitirá a la paleta agrupar visualmente la interfaz de forma robusta sin adivinanzas.
4. **Soft Deletes en Firestore:** Pasar de borrados destructivos a "borrados lógicos" añadiendo *flags* para proteger la propiedad intelectual de las empresas frente a accidentes.
5. **Estrategia Integral de Hatches (NUEVO):** 
   - Transicionar del modelo actual (Generar hatches con IA en caliente y descargarlos) hacia una **Colección Organizada Permanente de Hatches** pre-cargados.
   - El objetivo es que la Paleta Web funcione como un catálogo robusto donde el usuario pueda hacer click en un Hatch y usarlo "directamente" en el dibujo, con gestión unificada de descargas. Esto requiere replantear la inyección de `LC_ApplyAsset` para que soporte librerías amplias, control de escalas y visualizaciones precisas sin generar basura en `%TEMP%`.

---

## 🚨 Resolución de Bugs Críticos: Lag de Conexión Inicial (21 segundos)

**El Problema:**
Usuarios reportaron un retraso congelante de entre 20 a 40 segundos al iniciar la aplicación (al cargar `LC_Loader.lsp` o realizar la primera petición HTTP). 
Inicialmente se sospechaba de AutoCAD, de los servidores Cloud Functions, o de verificaciones estrictas de revocación de certificados SSL. Sin embargo, el diagnóstico comprobó que el lag de exactamente **21 segundos** se debe a la característica de **IPv6 Blackholing** de Windows.

**Causa Raíz:**
Cuando el loader usa `MSXML2.XMLHTTP.6.0` o `MSXML2.ServerXMLHTTP.6.0`, Windows resuelve el dominio `cloudfunctions.net` y encuentra registros IPv4 e IPv6. Windows prioriza IPv6 y envía un paquete TCP SYN. Si el router del usuario tiene el IPv6 mal configurado (hace "blackhole" descartando el paquete sin rechazarlo activamente), Windows espera por 3 segundos, reintenta (espera 6s), y vuelve a reintentar (espera 12s). Total: **21 segundos exactos** antes de abortar y saltar exitosamente al IPv4 en ~14ms. Windows cachea el fallo, haciendo que subsiguientes peticiones sean instantáneas hasta que el caché expire.

**La Solución Propuesta (Fase 3):**
Se comprobó que usar el motor **`WinHttp.WinHttpRequest.5.1`** junto con la inyección explícita de `SetTimeouts` resuelve el problema obligando a Windows a abortar el intento fallido mucho antes de los 21 segundos.
El código óptimo a implementar en el Loader y en `core_engine.lsp` a futuro es:
```lisp
(setq winhttp (vlax-create-object "WinHttp.WinHttpRequest.5.1"))
;; Timeouts en MS: Resolve=10000, Connect=2000, Send=30000, Receive=30000
;; Esto fuerza a abortar el IPv6 roto en solo 2 segundos y saltar a IPv4.
(vlax-invoke-method winhttp 'SetTimeouts 10000 2000 30000 30000)
(vlax-invoke-method winhttp 'Open "GET" url :vlax-false)
;; Opcional: Ignorar errores SSL de validación para entornos restrictivos
(vlax-put-property winhttp 'Option 4 13056)
(vlax-invoke-method winhttp 'Send)
```
*Recomendación:* Migrar todos los HTTP Getters nativos en LISP al objeto `WinHttpRequest.5.1` con timeouts acelerados para proteger la experiencia del usuario SaaS (B2B) en redes corporativas defectuosas.

---

## Arquitectura del Motor Paramétrico de Hatchs (HatchGenerator)

El sistema de Hatchs Paramétricos está diseñado para ofrecer patrones matemáticos calculados al vuelo, permitiendo a los usuarios ajustar espaciados, juntas y dimensiones sin depender de un catálogo rígido de archivos .PAT.

### Jerarquía de Fallback (Niveles de Seguridad)
Para garantizar que el usuario en AutoCAD siempre reciba una respuesta rápida al hacer clic en "Insertar" desde el Generador de Arquetipos, se diseñó un flujo con una triple red de seguridad:

1. **Nivel 1: Motor Matemático (Cloud Function / Ideal)**
   - El front-end invoca la Cloud Function `buildHatchPattern`, enviando los parámetros seleccionados por el usuario (ej: Row Spacing, Brick Width).
   - El backend evalúa la matemática de ese arquetipo específico (si ya ha sido desarrollado) y devuelve un código PAT preciso.
   - *Estado actual:* Implementado para los arquetipos base (stack, stretcher, flemish, etc.).

2. **Nivel 2: Archivo Estático de Respaldo (privateAssets)**
   - Si la invocación al backend falla (ya sea porque el motor para ese arquetipo aún está en desarrollo o por fallo de red), el sistema cae a este nivel silenciosamente.
   - Intenta leer un patrón base (MVP) pre-calculado desde la colección `privateAssets` en Firestore (ej: `hatch_mvp_hexagonal`).
   - Las reglas de seguridad de Firebase permiten lectura pública (`allow read: if true`) a `privateAssets` para que esta descarga funcione instantáneamente sin requerir autenticación en la Paleta.

3. **Nivel 3: Motor JIT de Conversión SVG (SvgToPatEngine)**
   - Si el archivo MVP en `privateAssets` no existiese (fue borrado o no se pre-calculó), el último nivel de respaldo es el conversor en tiempo de ejecución.
   - El sistema descarga el icono vectorial (.SVG) que representa al arquetipo, y utilizando `SvgToPatEngine.js`, traza y calcula las matemáticas del patrón directamente en la memoria del navegador.

### Experiencia de Usuario (UI) en Estado de Fallback
Cuando un arquetipo todavía no cuenta con la implementación de su motor matemático en el backend, se le marca con la propiedad `status: 'coming_soon'` en el archivo local de la paleta (`HatchEngine.js`). Esto provoca que:
- Los deslizadores paramétricos (Width, Height, Joints) queden ocultos bajo una capa translúcida con la leyenda "Beta / En Desarrollo".
- Se evitan frustraciones al usuario, impidiendo que mueva parámetros que no alterarán el patrón resultante.
- El botón de "Aplicar" sigue 100% activo, entregando siempre el patrón base del Nivel 2.
