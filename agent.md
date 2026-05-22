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

## Módulos Afectados Recientemente
- `TMD_Wires.lsp`: Controla el trazado interactivo (`c:TMD_WIRES`). Se actualizó para delegar la reconstrucción directamente en el motor sin reciclar bounding boxes (previniendo así derivas en rotación y justificación). Se aisló del sistema de niveles temporalmente para evitar fallos.
- `TMD_Vigas.lsp`: Contiene el motor `TMD:viga-build-geom` que interpreta el "ADN" y dibuja las extrusiones y cajas (`j2:bx`, `j2:cyl`, `j2:pline`).
- `TMD_Palette_Bridge.lsp`: Modificado para integrar el sistema de identidad persistente UUID y Handle Shadowing. Ahora listo para incorporar el cálculo preciso de la línea analítica y re-normalización de justificación.
- `web/inspector.html`: Actualizado con el deduplicador de datos para evitar repoblaciones innecesarias del catálogo, reduciendo el parpadeo.

## Estado de la Refactorización Planeada (Menús y Justificación)
Para solucionar el parpadeo/cierre abrupto de los dropdowns y la correcta justificación del sólido (LDATA y movimiento físico), se han diseñado las siguientes estrategias que quedan listas para ejecución:

1. **Inspector Web (`web/inspector.html`):**
   - Pausa de `leerJsDatos()` cuando el usuario tiene el catálogo abierto o campos `SELECT`/`INPUT` enfocados.
   - Alineación de los valores de justificación a los códigos nativos estructurales (`"MC"`, `"TC"`, `"BC"`, `"ML"`, `"MR"`).
2. **Puente y Geometría (`TMD_Palette_Bridge.lsp` & `TMD_Vigas.lsp`):**
   - Función `TMD:normalize-just` para normalizar strings legacy.
   - Función `TMD:get-analytical-line` para extraer con exactitud el eje de inserción original desde el sólido 3D de forma local (deshaciendo el desfase de la justificación anterior).
   - Reconstrucción de la viga en `TMD:palette-update-param` usando la línea analítica, lo que permite que el sólido se desplace físicamente al cambiar la justificación, y crezca simétricamente al cambiar de perfil.
   - Sincronización del rubber-band en `TMD:palette-pick-point` para usar el punto analítico opuesto exacto.
   - Inyección redundante de `"TMD_JUSTIFICACAO"` y `"TMD_ROTACAO"` en LDATA.

## Estado Comercial SaaS (LispCentral MVP)
- **Infraestructura:** Firebase Functions v2 (Node 20) sirve el LISP en memoria. El cargador AutoCAD (`TMD_Loader.lsp`) ejecuta código en RAM y previene guardado físico local.
- **Frontend / Landing Page:** Firebase Hosting. Diseño inspirado en el ecosistema Autodesk (oscuro, profesional, fuentes sans-serif limpias) acentuado con el naranja de la paleta TMD. CSS centralizado. Las imágenes de interfaz se alojan en Hosting.
- **Piloto Automático Actual:** Simular el aprovisionamiento de API Keys para facilitar el testeo de usuarios externos sin frenarse por seguridad IAM estricta. La prioridad es la disponibilidad, la presentación del producto y recibir feedback.
