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
* **Despliegues en Google Cloud CLI (`gcloud`):**
  Debido al timeout estricto del firebase cli local, los deploys de las Cloud Run functions gen2 se realizan mediante gcloud cli:
  ```powershell
  gcloud functions deploy getRoutine --gen2 --runtime=nodejs22 --region=us-central1 --source=./functions --entry-point=getRoutine --trigger-http --allow-unauthenticated --project=lispcentral
  ```
* **Enrutamiento del Backend:**
  El enrutamiento del backend (`functions/index.js`) ha sido modificado en su regex de saneamiento para admitir guiones medios (`-`), lo que permite que las peticiones a comandos de formato `ARQ-...` se validen y entreguen correctamente.

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
*El sistema ha evolucionado de "Generación Bajo Demanda" a un "Catálogo Global".*

### 1. Curaduría por IA (English First)
- Las Cloud Functions (Generadores de Hatch, Linetype e Iconos) utilizan la IA no solo para generar la matemática, sino como **Curador de Contenido**.
- La IA está instruida obligatoriamente para devolver un **nombre, descripción y categoría EN INGLÉS**, garantizando la uniformidad y estandarización del catálogo global.
- Los recursos se guardan directamente en la colección `publicAssets` de Firestore. Solo se almacena el código plano (`patCode`, `linCode`, `svgCode`), evitando el uso ineficiente de Storage (archivos físicos).

### 2. Panel de Biblioteca (LibraryPanel)
- Integrado de forma permanente en los generadores (Hatch, Lin, Icon).
- El usuario puede alternar entre "Resultados IA" (si acaba de generar algo) y "Biblioteca Pública" (contenido curado por la comunidad/IA).
- Permite filtrado semántico y categorización, además de ofrecer el botón "⭐ Añadir a Favoritos".
- Muestra los detalles y descripciones de los recursos directamente en el cuadro de selección.

### 3. Dashboard de Favoritos y Paleta Integrada
- **/favorites**: Consola web que agrupa los recursos guardados por el usuario. Permite eliminar ("Apagar") o descargar dinámicamente los recursos.
- **/palette**: Endpoint minimalista diseñado *exclusivamente* para ser cargado dentro de la paleta lateral de AutoCAD mediante un WebView (C# Loader).
- **Inyección Directa (Bridge)**: Al hacer clic en "Insertar en AutoCAD" desde `/palette`, se codifica la matemática en Base64 y se dispara `window.external.ExecuteAutoCADCommand()`, llamando a la función LISP `LC_ApplyAsset`. Esto inserta o aplica el bloque/trama sin salir jamás de la interfaz nativa del programa.

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
