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
- `TMD_BUILD.lsp` / `TMD_SYNC.lsp`: En proceso de readaptación a la nueva filosofía sin Wires.

## Próximos Pasos Identificados
- Limpiar código heredado de la V4 (ej: `c:TMD_JOINTS_INSPECT`, `c:TMD_FORENSIC`, `c:TMD_SYNC_PREVIEW`, etc.) que han quedado obsoletos al integrar la paleta web.
- Asegurar que la reconstrucción fuera del loop interactivo (por ejemplo, desde el panel de propiedades web) logre reconstruir el sólido sin deriva geométrica, a pesar de no contar con `PT_A` y `PT_B` explícitos en memoria.
