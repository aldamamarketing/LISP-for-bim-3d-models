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
4. **Simplificación:** Para evitar bloqueos, las rutinas de dibujo interactivo deben asegurar que el sistema no intente crear geometrías con distancia 0.

## Módulos Afectados Recientemente
- `TMD_Wires.lsp`: Controla el trazado interactivo (`c:TMD_WIRES`). Se actualizó para delegar la reconstrucción directamente en el motor sin reciclar bounding boxes (previniendo así derivas en rotación y justificación). Se aisló del sistema de niveles temporalmente para evitar fallos.
- `TMD_Vigas.lsp`: Contiene el motor `TMD:viga-build-geom` que interpreta el "ADN" y dibuja las extrusiones y cajas (`j2:bx`, `j2:cyl`, `j2:pline`). 
- `TMD_BUILD.lsp` / `TMD_SYNC.lsp`: En proceso de readaptación a la nueva filosofía sin Wires.

## Próximos Pasos Identificados
- Limpiar código heredado de la V4 (ej: `c:TMD_JOINTS_INSPECT`, `c:TMD_FORENSIC`, `c:TMD_SYNC_PREVIEW`, etc.) que han quedado obsoletos al integrar la paleta web.
- Asegurar que la reconstrucción fuera del loop interactivo (por ejemplo, desde el panel de propiedades web) logre reconstruir el sólido sin deriva geométrica, a pesar de no contar con `PT_A` y `PT_B` explícitos en memoria.
