# 🏠 LispCentral - Suite Arquitectura (ARQ)

Este directorio alberga las rutinas, stubs y recursos LISP de la **Suite de Arquitectura** de LispCentral. 

---

## 1. Visión y Fundamentos (Sala Blanca YQArch)
Nuestra suite de arquitectura se basa en una **sala blanca (clean room)** de las funcionalidades más potentes del plugin **YQArch**, adaptándolas al estándar de la industria y al motor SaaS de LispCentral:

* **Comandos de la Mano Izquierda**: Diseñados para que el usuario opere el teclado de manera ágil, pero utilizando **nombres descriptivos y semánticos** en lugar de atajos ultracortos difíciles de recordar.
* **Organización Semántica**: Todo el código se modulariza bajo la convención:
  `ARQ-[Sistema]-[ComandoDescriptivo]`
  Cada archivo `.lsp` de esta carpeta corresponde exactamente a un comando cargado bajo demanda (**JIT Loading**), permitiendo actualizaciones transparentes desde la nube.
* **Sin Reactores Complejos**: La automatización geométrica (como el corte y reparación de muros al mover vanos) se realiza mediante comandos interactivos síncronos en LISP, descartando reactores de eventos (`vlr-...`) que suelen corromper dibujos o ralentizar el motor de AutoCAD.
* **Integración Contextual de Paletas**: La interacción se compone de dos interfaces web:
  1. **Paleta de Comandos**: Listado y búsqueda Spotlight de herramientas.
  2. **Paleta de Propiedades Contextual**: Se actualiza automáticamente mostrando parámetros del comando en ejecución.

---

## 2. Estado Actual (Fase 1: Stubs & Conexión Contextual)
Actualmente, el proyecto se encuentra en la **Fase 1**:
- Se ha reestructurado por completo el repositorio, moviendo todas las rutinas de arquitectura a este directorio.
- Se han creado **15 archivos de stubs JIT** para los comandos core. Al invocarse en AutoCAD, imprimen el inicio de ejecución y envían el ID a la Paleta de Propiedades para actualizar el formulario del usuario.

### Mapa de Comandos y Archivos en esta Carpeta:
* **`ARQ-SYS-Config.lsp`**: Configuración global de dibujo (unidades, capas automáticas y escalas).
* **`ARQ-GRID-Axes.lsp`**: Generación de rejillas de ejes paramétricos.
* **`ARQ-GRID-Line.lsp`**: Trazado y etiquetado de ejes individuales.
* **`ARQ-WALL-Draw.lsp`**: Dibujo de muros paralelos interactivos.
* **`ARQ-WALL-FromAxis.lsp`**: Conversión instantánea de ejes seleccionados a muros.
* **`ARQ-WALL-Thickness.lsp`**: Cambio rápido del grosor de las paredes seleccionadas.
* **`ARQ-WALL-Trim.lsp`**: Limpieza de solapes en esquinas e intersecciones (T, L, Cruz).
* **`ARQ-COL-Insert.lsp`**: Inserción de columnas en cruces de ejes o puntos.
* **`ARQ-DOOR-Insert.lsp`**: Inserción de puertas con corte automático de muros.
* **`ARQ-WIN-Insert.lsp`**: Inserción de ventanas con corte automático de muros.
* **`ARQ-WALL-MoveOpening.lsp`**: Mover puertas/ventanas sanando la pared anterior de forma interactiva.
* **`ARQ-WALL-ResizeOpening.lsp`**: Modificar dimensiones de vanos existentes.
* **`ARQ-DIM-Opening.lsp`**: Acotado secuencial continuo de muros y vanos.
* **`ARQ-DIM-Quick.lsp`**: Acotación interior automática de cuartos.
* **`ARQ-SYM-Level.lsp`**: Simbología de niveles de piso dinámica.

---

## 3. Plan de Desarrollo Futuro para esta Suite
El desarrollo de las funcionalidades geométricas se realizará en fases secuenciales:

* **Fase 2: Geometría de Ejes y Muros**:
  Implementar la lógica real para dibujar el grid de ejes (`ARQ-GRID-Axes`) a partir de distancias y levantar muros dobles (`ARQ-WALL-Draw`) autolimpiables.
* **Fase 3: Algoritmos de Vanos**:
  Implementar la inserción de puertas y ventanas paramétricas, y la rutina interactiva de movimiento (`ARQ-WALL-MoveOpening`) encargada de soldar las polilíneas de la pared vieja y cortar el vano en la nueva coordenada.
* **Fase 4: Anotación y Cotas**:
  Desarrollar el acotado continuo inteligente de muros y vanos (`ARQ-DIM-Opening`) leyendo las coordenadas de inserción de los bloques dentro de los vectores del muro.