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

## Arquitectura de Carga SaaS — Stubs + JIT Loading (v3.5)

El sistema usa un modelo **JIT (Just-In-Time)** donde el código LISP se descarga bajo demanda, no al inicio.

### Flujo de Arranque
```
Cliente descarga LC_Loader.lsp de internet (una sola vez)
  └─> AutoCAD lo carga (manual o via soporte)
      └─> Define funciones core: LC:load-remote-routine, LC:run-or-load, LC:get-command-name
      └─> Auto-ejecuta c:CP1
          └─> WEBLOAD crea paleta lateral (inspector_unified.html)
              └─> palette_unified.js
                  └─> Fetch INDEX del servidor → lista de comandos disponibles
                  └─> Renderiza Command Palette con metadatos (METADATA_MAP)
                  └─> Click en comando → Acad.Editor.executeCommand → LC:run-or-load
```

### Archivos Clave del Sistema de Carga
| Archivo | Rol | Ubicación |
|---|---|---|
| `LC_Loader.lsp` | Bootstrap del cliente: define funciones de red + lanza CP1 | PC del cliente (descarga) |
| `web/palette_unified.js` | UI de la Command Palette + lógica de renderizado | Servido local desde directorio del loader |
| `web/inspector_unified.html` | HTML de la paleta (glassmorphism oscuro, spotlight search) | Servido local desde directorio del loader |
| `acaddoc.lsp` | **Solo desarrollo local** — carga directa desde Z: | Repositorio (no va al cliente) |

### Carga JIT (Just-In-Time)
- **`LC:run-or-load`**: Verifica si el comando existe en RAM (`type cmd-sym`). Si no, llama a `LC:load-remote-routine` para descargarlo y luego lo ejecuta.
- **`LC:load-remote-routine`**: Usa `MSXML2.XMLHTTP.6.0` (COM nativo de Windows) para HTTP síncrono. Evalúa el código en RAM con `eval (read ...)` envuelto en `vl-catch-all-apply`.
- **IPC via `USERS1`**: La función LISP escribe `"nombre:success"` o `"nombre:error"` en `USERS1` para feedback a la paleta JS.
- **Sin carga masiva al inicio**: `syncModulesSequentially()` está comentado. Solo se muestra "JIT PRONTO" en la paleta.

### Mapeo de Nombres
`LC:get-command-name` traduce nombres de archivo a comandos AutoCAD reales:
- `AcmMVP` → `ACM`, `EstruturaMVP` → `VIGA`, `TejadoMVP` → `TELHADO`, etc.
- Los nombres que no tienen mapeo se usan tal cual.

### Limitaciones Conocidas (Beta)
- **HTTP síncrono bloquea UI** durante descarga individual (~100-500ms por módulo). Aceptable para JIT.
- **Sin persistencia**: Funciones cargadas desaparecen al cerrar AutoCAD. Cada sesión re-descarga bajo demanda.
- **Código en texto plano**: HTTPS cifra en tránsito, pero no hay firma digital ni ofuscación. Pendiente para producción.
- **Namespace global**: AutoLISP no tiene módulos. Colisiones posibles si dos módulos definen la misma función.

## Infraestructura y Despliegues en Producción
* **Despliegues en Google Cloud CLI (`gcloud`):** Debido al límite rígido de 10s de timeout del Spec Parser de Firebase CLI local (que tarda en resolver la carga síncrona en entornos de desarrollo lentos), el deploy se realiza de forma directa en Cloud Run saltándose a Firebase:
  ```powershell
  gcloud functions deploy getRoutine --gen2 --runtime=nodejs22 --region=us-central1 --source=./functions --entry-point=getRoutine --trigger-http --allow-unauthenticated --project=lispcentral
  ```
* **Lazy Loading:** Las importaciones en `functions/index.js` (como `firebase-admin`) se realizan de forma diferida (dentro de las funciones que las requieren) para mantener la inicialización de Node en menos de 100ms.
* **Respaldo:** Las funciones adicionales de IA y Telemetría están comentadas en `index.js` para aliviar el bundle de producción y se respaldan en `functions/index_backup.js`.
