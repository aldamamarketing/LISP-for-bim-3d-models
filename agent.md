# TM Digital (TMD) - Agent Knowledge Base

## Estado del Proyecto (Versión 5.0)
El proyecto se encuentra en plena transición a la arquitectura de **Sólidos Independientes** (Versión 5.0). 
Se ha abandonado el concepto de `TMD_PARENT_WIRE` y polilíneas base ("Wires"). Ahora, cada viga o columna es un Sólido 3D (`3DSOLID`) independiente que contiene todo su "ADN" inyectado en la estructura de LDATA.

### Reglas de Arquitectura V5:
1. **No hay líneas base (Wires):** La geometría se genera directamente extrudiendo perfiles o usando operaciones booleanas (por ejemplo, cajas restadas) en el motor geométrico.
2. **Generación al vuelo:** Si un sólido necesita ser justificado, alineado o reconstruido, se elimina el sólido existente y se dibuja uno nuevo usando el LDATA guardado.
3. **LDATA (El ADN):** 
   - **SE DEBE EVITAR** almacenar el punto de inicio (`PT_A`), el punto final (`PT_B`) o la longitud fija en el LDATA. Esto permite que el usuario modifique la longitud del sólido manualmente en AutoCAD (usando grips) sin que los datos se corrompan o desincronicen.
   - Todo cálculo de longitud y orientación ("al vuelo") debe hacerse leyendo la geometría real del sólido o calculando el bounding box y ajustándolo.
   - Campos Clave Inyectados: `FORMA`, `DIM_X`, `DIM_Y`, `ESPESSURA`, `LABIO`, `MATERIAL`, `JUSTIFICACAO`, `ROTACAO`.
4. **Identidad Persistente (TMD_UUID / Handle Shadowing):**
   - Para mantener una identidad persistente en los sólidos (para bases de datos, BOM) incluso si se reconstruyen o se copian, se utiliza `TMD_UUID`.
   - **Clones de AutoCAD:** Al copiar nativamente (`COPY`, `MIRROR`), AutoCAD preserva el LDATA pero asigna un nuevo "Handle". Se guarda una propiedad "sombra" llamada `TMD_HOST_HANDLE`. Al inspeccionar un sólido, si el Handle nativo de AutoCAD es distinto a su `TMD_HOST_HANDLE` interno, se detecta como un clon, se resetean sus marcas y se le asigna un `TMD_UUID` nuevo automáticamente.
   - **Reconstrucciones de Código:** Cuando el código destruye y recrea la viga para cambiar el perfil o la longitud, el código arrastra el `TMD_UUID` original al nuevo sólido y sobreescribe deliberadamente el `TMD_HOST_HANDLE` para que la entidad no sea tratada como un clon.
5. **Simplificación:** Para evitar bloqueos, las rutinas de dibujo interactivo deben asegurar que el sistema no intente crear geometrías con distancia 0.

## Arquitectura de Carga y Sincronización SaaS (Versión 3.5)
Para lograr un arranque "Zero Friction" en AutoCAD y garantizar máxima seguridad y velocidad de red, el flujo se migró a un modelo **Index-Driven asíncrono gestionado por Chromium con delegación de red nativa LISP (IPC)**:

1. **Arranque instantáneo:** El cargador LISP local (`LC_Loader.lsp`) no realiza descargas de red al iniciar AutoCAD. Únicamente registra y ejecuta el comando `CP1` (Command Palette), liberando la consola inmediatamente.
2. **Command Palette (`web/inspector_unified.html`):** Es una paleta lateral unificada premium (glassmorphism oscuro, estilo "Spotlight" de búsqueda) que corre sobre el motor Chromium nativo de AutoCAD. Se rediseñó para ocultar la barra de desplazamiento predeterminada de Windows y organizar los comandos agrupados por categorías con contadores de comandos en tiempo real.
3. **Carga en segundo plano asíncrona delegada (IPC via USERS1):**
   - Al cargarse la paleta, esta lee los parámetros seguros de la URL y solicita al backend la lista indexada de rutinas.
   - En lugar de descargar el código en JavaScript (lo cual fallaba por límites de búfer y salto de línea en la consola de AutoCAD), la paleta JS delega secuencialmente la descarga a AutoCAD ejecutando la función LISP nativa `(LC:load-remote-routine "NOM_ROUTINE")` que usa `MSXML2.XMLHTTP.6.0`.
   - **Comunicación IPC:** La paleta JS realiza sondeos (polling) periódicos usando `Acad.Editor.getSystemVariable("USERS1")` para detectar cuando AutoCAD finaliza la carga de la rutina (`success` o `error`).
   - Al alcanzar el 100% de la carga, la barra de progreso se oculta automáticamente tras 1.5 segundos.
4. **Mapeo de Comandos e Inyección en RAM:**
   - La función LISP `LC:get-command-name` mapea los nombres de archivos de rutinas a los comandos AutoCAD correspondientes (ej: `AcmMVP` -> `ACM`, `EstruturaMVP` -> `VIGA`, `TejadoMVP` -> `TELHADO`).
   - `LC:run-or-load` verifica si el comando está cargado en RAM; si no, lo descarga bajo demanda y lo ejecuta inmediatamente.
5. **Inmunidad a Fallos en RAM:** La evaluación del código en AutoCAD se encapsula de forma aislada dentro de un bloque `(vl-catch-all-apply '(lambda () (eval (read ...))))`. Si un archivo específico tiene un error de balance de paréntesis en su sintaxis (como ocurría en `AbaParam`), el cargador lo reporta en consola pero continúa cargando los demás módulos de forma transparente.

## Infraestructura y Despliegues en Producción
* **Despliegues en Google Cloud CLI (`gcloud`):** Debido al límite rígido de 10s de timeout del Spec Parser de Firebase CLI local (que tarda en resolver la carga síncrona en entornos de desarrollo lentos), el deploy se realiza de forma directa en Cloud Run saltándose a Firebase:
  ```powershell
  gcloud functions deploy getRoutine --gen2 --runtime=nodejs22 --region=us-central1 --source=./functions --entry-point=getRoutine --trigger-http --allow-unauthenticated --project=lispcentral
  ```
* **Lazy Loading:** Las importaciones en `functions/index.js` (como `firebase-admin`) se realizan de forma diferida (dentro de las funciones que las requieren) para mantener la inicialización de Node en menos de 100ms.
* **Respaldo:** Las funciones adicionales de IA y Telemetría están comentadas en `index.js` para aliviar el bundle de producción y se respaldan en `functions/index_backup.js`.
