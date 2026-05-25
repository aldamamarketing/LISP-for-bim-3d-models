# 🏠 LispCentral - Suite Arquitectura 2D (Blueprint)

## 1. Visión del Producto
Una suite de comandos LISP, controlada por una paleta HTML5 en la nube, diseñada para **acelerar drásticamente el dibujo de planos arquitectónicos 2D** en AutoCAD. Se inspira en plugins masivamente populares como YQArch, pero con esteroides BIM (inyectando LDATA) y sin instalaciones complejas.

## 2. Mapa de Comandos y Herramientas

### A. Muros y Cerramientos Paramétricos
*   **`LC_WALL_DRAW`**: Dibuja polilíneas dobles (muros) de manera interactiva.
    *   *SaaS UI:* Selector de espesor (10cm, 15cm, 20cm), material (Ladrillo, Drywall) y justificación (Centro, Izquierda, Derecha).
    *   *LDATA Inyectado:* `{"Tipo":"Muro", "Espesor": 150, "Material": "Drywall", "Altura_Defecto": 2800}`.
*   **`LC_WALL_JOIN`**: Limpia automáticamente las intersecciones (T y L) entre muros `LC_WALL` seleccionados.
*   **`LC_WALL_TO_3D`**: (Bonus) Un botón en la web que lee el LDATA de todos los muros 2D y los extruye a su "Altura_Defecto", generando un borrador 3D al instante.

### B. Esquadrías (Puertas y Ventanas)
*   **`LC_DOOR_INSERT`**: Inserta un bloque dinámico de puerta y **corta/ajusta automáticamente el muro (polilínea doble)** en el que se inserta.
    *   *SaaS UI:* Selector de ancho de hoja (70cm, 80cm, 90cm) y sentido de apertura.
*   **`LC_WIN_INSERT`**: Inserta ventana, cortando muro y dibujando el antepecho.

### C. Anotación y Áreas (Rotulación Inteligente)
*   **`LC_ROOM_TAG`**: El usuario hace clic dentro de un espacio cerrado (ej. un dormitorio delimitado por muros). El comando hace un *Boundary* automático, calcula el área, y coloca un texto (ej. "Dormitorio - 12.50 m²").
    *   *LDATA:* El texto guarda el link al Boundary. Si el usuario mueve un muro y re-ejecuta el comando, el área se actualiza.

## 3. Arquitectura LISP + UI
- En lugar de reescribir rutinas DCL de miles de líneas (como hace YQArch), la lógica UI vive en React o Vanilla JS en el servidor LispCentral.
- Las macros pesadas de AutoCAD se envían usando `Acad.Editor.executeCommand`.

*(Revisa el código en esta carpeta para ver la implementación conceptual)*