# ÍNDICE MAESTRO DE FUNCIONES Y COMANDOS - TM DIGITAL (BIM v5.24)

Este documento es la **Fuente de Verdad** del proyecto. Antes de crear una nueva función, consulte este índice para reutilizar motores existentes y evitar "reinventar la rueda".

---

## 1. COMANDOS PÚBLICOS (USER INTERFACE)
*Invocables directamente desde la línea de comandos de AutoCAD.*

| Comando | Archivo | Descripción | Uso Recomendado |
| :--- | :--- | :--- | :--- |
| **TMD_PROPERTIES** | `TMD_Properties.lsp` | **Inspector BIM v5.0**. Interface principal para editar ADN, Justificación y Rotação. | Edición de parámetros. |
| **TMD_WIRES** | `TMD_Wires.lsp` | **Modo Libre 3D**: Trazado continuo de vigas ignorando bloqueos. | Dibujo rápido 3D. |
| **TMD_BUILD** | `TMD_Build.lsp` | **Compilador Generativo**. Convierte Wires en Sólidos 3D. | Generación de modelo físico. |
| **TMD_SYNC** | `TMD_SYNC.lsp` | **Motor de Integridad Industrial (v5.24)**. Saneador de ADN, resuelve conflictos colineales y regenera huérfanos (Fénix). | Tras copias, espejos o desincronización. |
| **TMD_SYNC_PREVIEW** | `TMD_SYNC.lsp` | **Auditoría de Salud BIM**. Reporta conflictos y fallos de vínculo sin modificar el dibujo. | Verificación de integridad. |
| **TMD_FORENSIC** | `TMD_Forensic.lsp` | **Inspector Forense v3.0**. Diagnóstico total: Realidad física vs ADN LData. Rastreo automático de parejas. | Investigación de errores o inconsistencias. |
| **TMD_ALIGN** | `TMD_Align.lsp` | **Alineación Industrial**. Motor estilo Corel (L, R, T, B, C, E). | Organización de grupos. |
| **TMD_NIVEIS** | `TMD_Niveis.lsp` | **Sincronizador de Niveles**: Edición global de alturas y nombres. | Cambios globales de Z. |
| **CP1** / **TMD_INSPECT** | `LC_Loader.lsp` | **Command Palette SaaS**: Panel Chromium unificado de búsqueda y ejecución de comandos en RAM. | Lanzamiento de interfaz. |

---

## 2. MOTORES DE EDICIÓN CONTEXTUAL (CUI / RIGHT-CLICK)
*Optimizados para ejecución rápida sobre una selección previa.*

| Función | Archivo | Descripción | Lógica Interna |
| :--- | :--- | :--- | :--- |
| **TMD_WIRES_EDIT_ROT** | `TMD_Wires.lsp` | Rotación interactiva (Ciclo R, T, E). | Usa `TMD:wire-get-smart-just`. |
| **TMD_AL_[L-E]** | `TMD_Align.lsp` | Accesos directos para alineación. | Detección de objeto Maestro. |
| **TMD_MATCH** | `TMD_MATCH.lsp` | Match Properties BIM. | Copia ADN LData completo. |

---

## 3. NÚCLEO INTERNO: MOTORES LÓGICOS
*Estas funciones son el "ADN" del sistema. **NO LAS REINVENTE**.*

### A. Gestión de Datos y ADN (LData) - `TMD_Utils.lsp` / `TMD_SYNC.lsp`
- `(TMD:bim-get-adn ent)` / `(TMD:bim-set-adn ent params)`: Acceso principal al diccionario `TMD_PARAMS`.
- `(TMD:sync-phoenix s_ent)`: **Fase Fénix**. Regenera un Wire perfecto basándose en el sólido.
- **Saneador de ADN:** Protocolo que actualiza `TMD_SELF_HANDLE` al Handle real del dibujo actual.

### B. Lógica de Justificación y Rotación
- `(TMD:util-get-real-justification w s)`: (`TMD_SYNC.lsp`) Deduce la justificación física actual (TC, MC, etc.) analizando la posición relativa.
- `(TMD:wire-get-smart-just just)`: Calcula nueva justificación tras rotación de 90°.

### C. Utilidades Matemáticas 3D y Contención
- `(TMD:util-is-longitudinal-match mid vector pt len)`: **Regla Invariable del Centro**. Valida si un punto está dentro del tramo de un sólido.
- `(TMD:util-get-off-axis-dist pt line)`: Calcula la desviación perpendicular de un punto respecto a un eje.

---

## 4. REGLAS DE ORO PARA DESARROLLADORES (IA & HUMAN)
1. **DNA Persistence**: El `TMD_SELF_HANDLE` debe ser saneado tras cada copia masiva usando `TMD_SYNC` para mantener la validez de `handent`.
2. **Geometric Sovereignty**: La geometría física del sólido manda. Si el LData difiere de la posición real, el motor debe priorizar la realidad 3D.
3. **Midpoint Lock**: En vigas colineales, el vínculo se decide exclusivamente por la posición del centro del cable respecto al sólido.
4. **Z-Control**: Siempre consulte `TMD_NIVEIS` antes de forzar una coordenada Z absoluta.

---
**Versión:** 5.24 | **Estado:** Estable | **Última Actualización:** 12/05/2026 (Industrial Integrity Update)
