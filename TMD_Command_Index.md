# ÍNDICE MAESTRO DE FUNCIONES Y COMANDOS - TM DIGITAL (BIM v5.0)

Este documento es la **Fuente de Verdad** del proyecto. Antes de crear una nueva función, consulte este índice para reutilizar motores existentes y evitar "reinventar la rueda".

---

## 1. COMANDOS PÚBLICOS (USER INTERFACE)
*Invocables directamente desde la línea de comandos de AutoCAD.*

| Comando | Archivo | Descripción | Uso Recomendado |
| :--- | :--- | :--- | :--- |
| **TMD_PROPERTIES** | `TMD_Properties.lsp` | **Inspector BIM v5.0**. Interface principal para editar ADN, Justificación y Rotação. | Siempre que se necesite editar parámetros de elementos existentes. |
| **TMD_WIRES** | `TMD_Wires.lsp` | **Modo Libre 3D**: Trazado continuo de vigas ignorando bloqueos del pincel. Calcula niveles/offsets dinámicamente. | Para dibujo rápido 3D basado en Snaps. |
| **TMD_WIRES_PINCEL** | `TMD_Wires.lsp` | **Modo Determinado**: Trazado que respeta ciegamente la configuración de niveles y tipos del Inspector. | Invocado automáticamente desde el DCL. |
| **TMD_BUILD** | `TMD_Build.lsp` | **Compilador Generativo**. Convierte Wires en Sólidos 3D y aplica juntas. | Para generar el modelo físico 3D final. |
| **TMD_JOINTS** | `TMD_JOINTS.lsp` | **Gestor de Juntas**. Resuelve interferencias (Flush, Miter, Crossing). | Para detallar encuentros entre perfiles. |
| **TMD_ALIGN** | `TMD_Align.lsp` | **Alineación Industrial**. Motor estilo Corel (L, R, T, B, C, E). | Organización rápida de componentes y grupos. |
| **TMD_SYNC** | `TMD_SYNC.lsp` | **Motor de Integridad BIM (v5.1)**. Detecta clones y re-vincula el ADN usando huellas digitales. | Tras operaciones de copia o guardado masivo. |
| **TMD_SYNC_SPATIAL** | `TMD_Utils.lsp` | **Sanador Espacial (Legacy)**. Repara vínculos perdidos basándose en proximidad geométrica. | Fallback si el motor de huellas falla. |
| **TMD_NIVEIS** | `TMD_Niveis.lsp` | **Sincronizador BIM**: Gestor de niveles con edición global. Propaga cambios de Z y Nombre a todo el modelo. | Configuración y cambios globales de altura. |

---

## 2. MOTORES DE EDICIÓN CONTEXTUAL (CUI / RIGHT-CLICK)
*Optimizados para ejecución rápida sobre una selección previa.*

| Función | Archivo | Descripción | Lógica Interna |
| :--- | :--- | :--- | :--- |
| **TMD_WIRES_EDIT_ROT** | `TMD_Wires.lsp` | Rotación interactiva (Ciclo R, T, E). | Usa `TMD:wire-get-smart-just` para preservar centroides. |
| **TMD_AL_[L-E]** | `TMD_Align.lsp` | Accesos directos para alineación (Left, Right, etc.). | Soporta Grupos y detección de objeto Maestro. |
| **TMD_MATCH** | `TMD_MATCH.lsp` | Match Properties BIM. | Copia el ADN (LData) completo entre objetos. |

---

## 3. NÚCLEO INTERNO: MOTORES LÓGICOS (REUTILIZAR AQUÍ)
*Estas funciones son el "ADN" del sistema. **NO LAS REINVENTE**.*

### A. Gestión de Datos y ADN (LData) - `TMD_Utils.lsp`
- `(TMD:bim-get-adn ent)` / `(TMD:bim-set-adn ent params)`: Acceso principal al diccionario `TMD_PARAMS`.
- `(TMD:bim-get-reg key default)`: Recupera configuraciones persistentes del Registro de Windows.
- `(TMD:sync-model silent)`: Motor de búsqueda y reparación de integridad Wire-Solid.

### B. Lógica de Justificación y Rotación - `TMD_Wires.lsp`
- `(TMD:wire-get-smart-just just)`: **CRÍTICO**. Calcula la nueva justificación tras una rotación de 90° para que el perfil no se desplace de su eje.
- `(TMD:wire-evaluate-vector p1 p2)`: Determina si un vector es "VIGA", "COLUNA" o "CONTRAVENTAMENTO".
- `(TMD:wire-get-nearest-level z)`: Busca el nombre del Nivel más cercano a una coordenada Z dada.

### C. Utilidades Matemáticas 3D - `TMD_Utils.lsp`
- `(TMD:util-vector-cross v1 v2)` / `(TMD:util-vector-dot v1 v2)`: Álgebra vectorial estándar.
- `(TMD:util-vector-unit v)`: Normalización de vectores.
- `(TMD:util-get-rotation-matrix v)`: Genera matriz de transformación para alinear el eje X con el vector `v`.
- `(TMD:util-get-directional-len s_ent w_ent)`: Calcula la **longitud física real** (post-cortes) de un sólido.

---

## 4. MOTOR GEOMÉTRICO Y CONSTRUCCIÓN
*Funciones de bajo nivel para generación de sólidos.*

- `(TMD:build-single-wire ent)`: (`TMD_Build.lsp`) Borra el sólido antiguo y compila uno nuevo basado en el ADN del Wire.
- `(TMD:viga-build-geom ...)`: (`TMD_Vigas.lsp`) La función más pesada. Genera la geometría 3D bruta (Extrusión/Barrido).
- `(j2:make-cutter master slave gap type)`: (`TMD_JOINTS.lsp`) Crea operadores booleanos para recortes estructurales.

---

## 5. REGLAS DE ORO PARA DESARROLLADORES (IA & HUMAN)
1. **Centroid-Preservation**: Nunca cambie la rotación sin llamar a `TMD:wire-get-smart-just`.
2. **Async Loops**: Para alternar entre comandos (ej. Properties -> Wires), use `vla-sendcommand` para evitar desbordamiento de pila (Stack Overflow).
3. **Data Integrity**: El `TMD_PARENT_WIRE` (en el Sólido) y el `TMD_CHILD_SOLID` (en el Wire) deben estar siempre sincronizados por Handle.
4. **Z-Control**: Siempre consulte `TMD_NIVEIS` antes de forzar una coordenada Z absoluta.

---
**Versión:** 5.0 | **Estado:** Estable | **Última Actualización:** 06/05/2026 (Sync Engine)
