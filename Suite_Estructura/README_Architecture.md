# 🏗️ LispCentral - Suite Estructura 2D (Blueprint)

Este directorio contiene el mapa del proyecto y la arquitectura de alto nivel para el MVP de la **Suite de Estructura 2D** de LispCentral. El objetivo es transformar AutoCAD en una herramienta de modelado paramétrico 2D conectada a la nube.

## 1. Arquitectura del Sistema (SaaS + AutoCAD)

El modelo LispCentral se basa en tres pilares:

1.  **El Servidor (Firebase/Firestore):** Aloja las bases de datos de perfiles comerciales (AISC, Gerdau, Tubos, etc.). Provee los datos a la paleta HTML de forma dinámica.
2.  **La Paleta Web (HTML5/JS):** Reemplaza las antiguas ventanas DCL. Se ejecuta dentro del motor Chromium de AutoCAD. Permite buscar perfiles, ver previsualizaciones y comunicarse asíncronamente con el motor de AutoCAD usando `Acad.Editor`.
3.  **El Motor LISP (AutoLISP):** Recibe instrucciones de la paleta JS, dibuja las polilíneas/geometrías e inyecta **LDATA** (metadatos) dentro de los objetos dibujados.

### Flujo de Trabajo Típico
1. El usuario abre la paleta "LispCentral Estructuras".
2. La paleta web descarga vía HTTP la lista de perfiles "W" (Vigas) desde Firebase.
3. El usuario selecciona "W12x26" y hace clic en "Dibujar Planta".
4. El JavaScript de la paleta envía un comando a AutoCAD: `Acad.Editor.executeCommand("LC_STEEL_DRAW W12x26 TOP ")`.
5. El comando LISP `LC_STEEL_DRAW` dibuja la polilínea y le inyecta un diccionario LDATA oculto: `{ID: "...", Tipo: "W12x26", PesoLineal: 38.7}`.
6. El usuario ajusta la viga gráficamente usando los grips estándar de AutoCAD (estirando la polilínea).
7. Más tarde, el usuario hace clic en "Calcular Peso" en la paleta web.
8. El LISP `LC_BOM_EXPORT` escanea el dibujo, lee la longitud real de la línea modificada, la multiplica por el peso en el LDATA, y devuelve un JSON al JavaScript.
9. La paleta web muestra la tabla de materiales final.

---

## 2. Mapa de Comandos Propuestos

### A. Modelado Inteligente
*   **`LC_STEEL_DRAW`**: Dibuja perfiles normalizados (I, C, L, T, Tubos) en diferentes vistas (Sección, Planta, Elevación) e inyecta su "ADN" (LDATA).
*   **`LC_STEEL_MATCH`**: Transfiere las propiedades paramétricas y LDATA de una entidad a otra, actualizando su geometría.
*   **`LC_PLATE_GEN`**: Dibuja placas de anclaje paramétricas con opciones para agujeros (booleanos 2D).

### B. Cálculos y Extracción de Datos
*   **`LC_PROPERTIES`**: Calcula el centroide, área neta, perímetro y Momentos de Inercia (Ix, Iy) de cualquier polilínea cerrada (ideal para perfiles extruidos de aluminio personalizados).
*   **`LC_BOM_EXPORT`**: Analiza todas las entidades LispCentral en el modelo, extrae LDATA y geometría real, consolidando cantidades de obra, longitudes de corte y pesos totales en formato JSON.
*   **`LC_AUTO_TAG`**: Lee el LDATA de un perfil y genera automáticamente una cota o directriz con su nombre y propiedades, manteniendo sincronización si el objeto cambia.
*   **`LC_XYZ_TABLE`**: Extrae coordenadas de nodos estructurales y genera una tabla dinámica.

---

## 3. Guía de Implementación Futura

Para poner este MVP en producción, los siguientes pasos son necesarios:
1.  **Frontend Web**: Hospedar `palette_mockup.html` en el servidor web.
2.  **Base de Datos**: Poblar Firestore con catálogos CSV reales de perfiles.
3.  **Backend LISP**: Compilar los scripts `.lsp` de esta carpeta en el loader principal de LispCentral.
4.  **AutoCAD Plugin**: Asegurarse de que el script de inicio registre la paleta con la URL alojada usando `Acad.Application.addPalette()`.