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
El sistema cuenta con un panel de propiedades dinámico lateral (`web/properties_unified.html` y `web/properties_unified.js`) diseñado para operar en paralelo a la paleta de comandos.

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

## Infraestructura y Despliegues en Producción
* **Despliegues en Google Cloud CLI (`gcloud`):**
  Debido al timeout estricto del firebase cli local, los deploys de las Cloud Run functions gen2 se realizan mediante gcloud cli:
  ```powershell
  gcloud functions deploy getRoutine --gen2 --runtime=nodejs22 --region=us-central1 --source=./functions --entry-point=getRoutine --trigger-http --allow-unauthenticated --project=lispcentral
  ```
* **Enrutamiento del Backend:**
  El enrutamiento del backend (`functions/index.js`) ha sido modificado en su regex de saneamiento para admitir guiones medios (`-`), lo que permite que las peticiones a comandos de formato `ARQ-...` se validen y entreguen correctamente.
