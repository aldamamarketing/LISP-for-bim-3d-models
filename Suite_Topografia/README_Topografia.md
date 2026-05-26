# ⛰️ LispCentral - Suite Topografía 2D (Blueprint)

## 1. Visión del Producto
Los topógrafos y agrimensores gastan incontables horas importando puntos de estaciones totales (CSV/TXT) a AutoCAD, dibujando triangulaciones (TIN) y exportando coordenadas de replanteo. Esta suite, combinada con la interfaz web, convertirá AutoCAD en un software topográfico ligero.

## 2. Mapa de Comandos y Herramientas

### A. Gestión de Puntos
*   **`LC_POINT_IMPORT`**: El asesino del tedio.
    *   *SaaS UI:* Un área de "Drag & Drop" en la paleta web para arrastrar el archivo CSV de la estación total (ej. Formato: `Punto, N, E, Z, Descripcion`). El JS parsea el archivo instantáneamente y manda a AutoCAD comandos optimizados de dibujo.
    *   *Acción:* Dibuja nodos (`POINT`) o Bloques con atributos dinámicos en AutoCAD, inyectando la descripción original en el LDATA.
*   **`LC_XYZ_EXPORT`**: Proceso inverso. Selecciona puntos/bloques en pantalla y la web genera una tabla Excel descargable al instante con las coordenadas X, Y, Z.

### B. Geometría Terrestre
*   **`LC_TIN_MESH`**: (Avanzado) Triangulación de Delaunay en 2D/3D. Convierte una nube de puntos importada en una malla 3DFACE.
*   **`LC_SLOPE_ARROW`**: Dibuja flechas que indican el porcentaje de pendiente entre dos puntos seleccionados. El LISP calcula automáticamente: `Pendiente % = (Delta Z / Distancia XY) * 100`.

### C. Parcelas y Cuadros de Construcción
*   **`LC_PARCEL_DATA`**: Selecciona una polilínea cerrada (Lote/Parcela).
    *   *Acción:* Extrae área, perímetro, e inyecta número de lote.
*   **`LC_CUADRO_RUMBOS`**: El comando topográfico más buscado. Lee los vértices de una polilínea y genera una tabla en el dibujo con: *Estación, Punto Visado, Rumbo/Azimut, Distancia, Vértice, Coordenadas X, Coordenadas Y*.

## 3. Ventaja del Modelo LispCentral (Web)
*   Las tablas y cuadros de rumbos son tediosos de dibujar usando primitivas de AutoCAD. Con LispCentral, el LISP solo calcula la matemática y extrae las coordenadas; la **Paleta Web renderiza la tabla en HTML** y permite exportar a PDF o Excel con un clic, o, si el usuario lo desea, generar el objeto OLE/Table en AutoCAD vía automatización COM.