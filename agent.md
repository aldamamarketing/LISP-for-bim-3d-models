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
El Dashboard web (React + Firebase) se ha reestructurado para operar como una consola SaaS profesional y "Mobile Friendly":
*   **Jerarquía Visual:** Priorización de *Assinatura & Licenças* y *Equipamentos Vinculados* en la parte superior, seguido del *Workspace LISPs*.
*   **God Mode (Beta):** Los Beta Testers pueden incrementar sus asientos (`seats`) directamente desde el dashboard sin pasar por la pasarela de Stripe. Esta acción actualiza `maxSeats` en la base de datos instantáneamente.
*   **Workspace Inteligente:** Los archivos cargados en la nube se ordenan automáticamente de forma alfabética por *Suite*, luego por *Grupo* y finalmente por *Nombre Amigable*. Soporta carga masiva y vinculación de iconos SVG dinámicos.
*   **Centro de Soporte:** Incluye un menú interactivo en la cabecera para "Reportar Bug" (conectado directamente a la colección `feedback` de Firestore) y una sección de FAQ desplegable al final de la página.
*   **Notificaciones:** Sistema de campana interactiva (Dropdown) con contador de mensajes no leídos y capacidad de cambiar el estado de lectura en tiempo real.
*   **IDs Semánticos en Firestore:** La carga de rutinas LISP utiliza `setDoc` para forzar la creación de documentos en `lispFiles` con IDs predecibles y semánticos (`lisp_[tenantId]_[lispId]`), abandonando los UUIDs aleatorios nativos de Firebase.
*   **Desbloqueo de Custom Suites:** El backend (Cloud Run) ahora permite que la paleta nativa recupere absolutamente todos los LISPs pertenecientes al `tenantId` del usuario activo, ignorando el filtro restrictivo de `activeSuites` (que solo aplica para los módulos base de la plataforma).

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

## 🚨 PROBLEMA CRÍTICO: Bridge JavaScript ↔ AutoCAD en Paletas Web (Junio 2026)

### Contexto del Problema
Las paletas web de LispCentral se sirven desde Firebase Hosting (`lispcentral.web.app/palette`) y se cargan dentro de AutoCAD como paneles laterales HTML usando la API `Acad.Application.addPalette()`. El objetivo es que al hacer clic en una card de comando, la paleta ejecute la función LISP correspondiente en AutoCAD.

### Problema 1: Pantalla Blanca al Clicar (RESUELTO ✅)
**Causa raíz:** En `autocadBridge.js`, cuando ningún método de ejecución funcionaba, existía un fallback destructivo:
```javascript
window.location.href = "acad:" + cmdStr; // ESTO MATA EL DOM DE REACT
```
Esto navegaba la página del panel a un protocolo inexistente, destruyendo React → pantalla blanca.

**Fix aplicado:** Se eliminó esa línea. El último fallback ahora es copiar al portapapeles. Commit `ab6ceee`.

### Problema 2: `exec is not defined` (EN INVESTIGACIÓN 🔍)
**Síntoma:** Al clicar un comando, el bridge intenta `Acad.Editor.executeCommandAsync()` y `Acad.Editor.executeCommand()`, pero ambos fallan con:
```
ReferenceError: exec is not defined
    at Object.executeCommand (Autodesk.AutoCAD.js:6010)
```

**Causa raíz identificada:** La API JavaScript cargada desde CDN (`https://df-prod.autocad360.com/jsapi/v3/Autodesk.AutoCAD.js`) internamente usa una función global `exec()` para comunicarse con el engine nativo de AutoCAD. Esta función `exec()` es **inyectada por el engine CEF/WebView2 de AutoCAD** en el contexto del navegador embebido. Sin `exec()`, NINGUNA función de la API puede comunicarse con AutoCAD.

### Análisis de la API `Autodesk.AutoCAD.js` v3 (CDN)

#### Hallazgos clave del código fuente:
1. **`evaluateLisp` NO EXISTE** en esta API. No está definido en ninguna parte del archivo. La documentación del `agent.md` anterior que mencionaba `Acad.Editor.evaluateLisp` era incorrecta — esa función simplemente no existe en la API v3.

2. **`exec()` es la ÚNICA puerta de comunicación.** Toda función interop (`EditorInterop.executeCommand`, `ApplicationInterop.addPalette`, `EditorInterop.getPoint`, etc.) internamente llama a:
   ```javascript
   var jsonStr = exec(JSON.stringify({
       functionName: 'Ac_EditorInterop.executeCommand',
       functionParams: { commands: commands, onSuccess: onSuccess, onError: onError }
   }));
   ```

3. **La API del CDN tiene Copyright 2012** y fue diseñada para la era CEF (Chromium Embedded Framework). Es **legacy**.

4. **`Acad.Application.addPalette` SÍ FUNCIONA** (las paletas se crean correctamente), porque esta llamada se ejecuta desde un archivo JS cargado por `WEBLOAD` en el contexto principal de AutoCAD (donde `exec` SÍ existe), NO desde la paleta HTML.

#### Tabla de Compatibilidad por Versión de AutoCAD:

| Versión AutoCAD | Engine de Navegador | `exec()` disponible | Estado |
|---|---|---|---|
| 2018-2020 | CEF (viejo) | ✅ Inyectada como global | Funciona con API v3 CDN |
| 2021-2022 | CEF (actualizado) | ✅ Inyectada como global | Funciona con API v3 CDN |
| 2023+ | Microsoft Edge WebView2 | ❌ `exec` sincrónico eliminado | `exec is not defined` |
| 2024-2026 | WebView2 | ❌ Requiere `execAsync()` | Requiere migración |

### Diagnóstico en el Entorno del Desarrollador (AutoCAD 2021)
- AutoCAD 2021 usa **CEF**, por lo que `exec` DEBERÍA estar disponible.
- Pero el error `exec is not defined` OCURRE → esto indica que **la paleta HTML cargada vía `addPalette(url)` desde una URL remota (HTTPS) probablemente NO recibe la inyección de `exec`**.
- **Hipótesis principal:** AutoCAD solo inyecta `exec` en contextos "locales" (archivos cargados vía `WEBLOAD` desde disco o temp). Las paletas que cargan URLs HTTPS externas corren en un sandbox más restrictivo donde `exec` no se expone.

### Posibles Soluciones (Por Prioridad)

#### Solución A: Archivo JS Temporal como Puente (RECOMENDADA — Sin Dependencia de API)
En lugar de llamar `exec` directamente desde la paleta HTML, la paleta escribe su intención en un mecanismo intermedio y un reactor LISP la ejecuta:

1. **La paleta web** escribe el comando deseado en `localStorage` con una key específica (ej: `lc_pending_command`).
2. **Un reactor LISP** (ya existe `LC:DocChanged-Callback`) o un timer periódico lee un archivo JS temporal que el propio LISP genera/inyecta vía `WEBLOAD`.
3. **Variante más simple:** La paleta escribe el comando en una variable de sistema (`USERS1`-`USERS5`) usando `Acad.Editor.setSystemVariable()` (si funciona sin `exec`), y un reactor LISP lo detecta.

**Problema:** Si `setSystemVariable` también usa `exec` internamente (probable), esta vía también falla.

#### Solución B: Servir Paleta desde Archivo Local (Temporal)
En vez de cargar `https://lispcentral.web.app/palette`, servir la paleta desde un archivo HTML local generado en TEMP:

1. El loader LISP descarga el HTML compilado de la paleta a `%TEMP%/LC_Palette.html`.
2. `addPalette("Command Palette", tempFilePath)` carga un archivo LOCAL.
3. Los archivos locales SÍ reciben la inyección de `exec` por parte de AutoCAD.
4. El HTML local hace fetch a la API cloud para datos pero ejecuta comandos vía `exec` local.

**Ventaja:** Compatibilidad con TODAS las versiones de AutoCAD (2018-2026).
**Desventaja:** Requiere que el LISP loader descargue el HTML y sus assets JS en cada sesión (o cachee).

#### Solución C: `execAsync` para AutoCAD 2023+ (Solo versiones nuevas)
Para AutoCAD 2023+, reemplazar `exec()` por `execAsync()` que es la versión Promise-based del bridge:
```javascript
execAsync(JSON.stringify({
    functionName: 'Ac_EditorInterop.executeCommand',
    functionParams: { commands: commands }
})).then(result => { ... });
```
**Problema:** No resuelve AutoCAD 2021-2022 donde `exec` no se inyecta en paletas remotas.

#### Solución D: Proxy LISP vía Variable de Sistema + Polling (Workaround)
1. La paleta web escribe el nombre del comando en `USERS1` usando algún mecanismo que funcione.
2. Un timer LISP periódico (via `vl-catch-all-apply`) lee `USERS1` y ejecuta `LC:run-or-load` si encuentra un valor.
3. **Problema:** No hay garantía de que la paleta pueda escribir USERS1 sin `exec`.

### Archivos Relevantes
- `web/src/utils/autocadBridge.js` — Bridge JS principal (ya corregido para no crashear)
- `web/src/components/LispCommandPalette.jsx` — Paleta de comandos (usa `LC:run-or-load`)
- `web/src/palettes-entry/palette.html` — Entry point HTML de la paleta
- `web/vite.palettes.config.mjs` — Config de build Vite para paletas (target chrome65)
- `C:\Users\TM PROJETOS\Downloads\LC_Loader.lsp` — Loader LISP compilado que corre en AutoCAD
- API CDN: `https://df-prod.autocad360.com/jsapi/v3/Autodesk.AutoCAD.js` (legacy, copyright 2012)

### Estado Actual (Junio 2026)
- ✅ Paleta NO crashea al clicar (fix aplicado)
- ✅ Paleta carga correctamente desde la nube (30 comandos)
- ✅ Los comandos LISP funcionan desde la consola de AutoCAD
- ✅ `LC:run-or-load` descarga y ejecuta rutinas JIT correctamente
- ❌ La paleta NO puede enviar comandos a AutoCAD (bridge `exec` no disponible)
- 🔍 Próximo paso: Implementar Solución B (paleta local desde TEMP) como la más compatible

