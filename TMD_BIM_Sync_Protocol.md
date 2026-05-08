# TMD - Protocolo de Sincronización BIM (Reglas de Negocio)
**Versión:** 1.2  
**Fecha:** 2026-05-07
**Audiencia:** Agentes de IA / Desarrolladores TMD
**Estatus:** Auditoría Genética de Clones (Refinado)

## 1. Casos de Copia y Recuperación (Motor SYNC)

### Escenario 1: Clon en Pareja (Sólido + Wire)
1. **Detección:** Sólido identificado como `CLONE` (Handle != SELF_HANDLE).
2. **Búsqueda:** Escaneo espacial en sección perpendicular central para hallar Wires dentro del volumen del sólido.
3. **Filtro Genético:**
   - Debe ser Wire con LData + Ser un Clon.
   - **Genealogía:** Wire[SELF_HANDLE] == Sólido[PARENT_WIRE] (Referencia al padre original).
4. **Acción:**
   - Vincular Handlers nuevos (New Wire <-> New Solid).
   - **¡CRÍTICO!:** Recalcular Asociación (Justificación) y Rotación. Detectar si el clon fue espejado o rotado.
   - Sincronizar niveles y saneado de Z.

### Escenario 2: Sólido Huérfano (Solo Sólido)
1. **Búsqueda:** Igual que Escenario 1, pero no se detecta Wire clon en el volumen.
2. **Acción:**
   - Si el `Wire Original (W1)` existe: Clonar su configuración (Joints, Anclaje, Nivel).
   - **Engendrar:** Crear una nueva `LINE` (Wire) en la posición analítica calculada desde el sólido.
   - Vincular y sanear.

### Escenario 3: Wire Huérfano (Solo Wire)
1. **Acción:** Escanear volumen para detectar hijos (Sólidos) compatibles.
2. **Resultado:**
   - **Si no detecta:** Ejecutar `BUILD` para generar nuevo sólido según ADN del Wire.
   - **Si detecta:** Evaluar asociación y vincular.

## 2. Reglas de Oro de Ejecución
- **No Duplicidad:** Verificar siempre mediante escaneo espacial antes de crear entidades nuevas para evitar superposiciones.
- **Soberanía del LData:** El LData es la persistencia, pero la Geometría es la Verdad. Si discrepan, el Sincronizador (SYNC) o el Inspector (PROPERTIES) deben corregir el LData.
- **Aislamiento de Grupos:** Durante procesos masivos, desactivar `PICKSTYLE` para permitir el tratamiento individual de cada componente paramétrico.
