# 📐 LispCentral Hatch Engine: Pautas Arquitectónicas y Matemáticas

Este documento recopila las lecciones críticas, reglas geométricas y estándares de programación desarrollados durante la creación del motor paramétrico de patrones `.pat` y renderizado SVG.

> [!IMPORTANT]
> Todo nuevo patrón (arquetipo) que se agregue al `HatchEngine.js` debe cumplir rigurosamente con estas reglas para garantizar que lo que el usuario ve en la pantalla sea **exactamente** lo que se exporta hacia AutoCAD.

---

## 1. El Puente Matemático: SVG vs PAT

La principal causa de errores visuales y desfases es entender de forma equivocada cómo dibujan la web y AutoCAD.

### 🕸️ SVG (Renderizado Web)
- **Paradigma**: Geometría finita y explícita.
- **Lógica**: Dibuja **segmentos de línea** con un punto de inicio `(X1, Y1)` y un punto final `(X2, Y2)`.
- **Comportamiento**: Un patrón se logra dibujando la "Célula Base" dentro de un bounding box, y la etiqueta `<pattern>` de SVG se encarga de teselar esa caja una y otra vez en mosaico ortogonal.

### 🏗️ AutoCAD (.PAT)
- **Paradigma**: Vectores de propagación infinita.
- **Lógica**: Dibuja **líneas infinitas**. A partir de un Origen `(X, Y)` y un Ángulo `A`, la línea viaja infinitamente.
- **Comportamiento**: Los patrones se forman porque esa línea infinita se fragmenta (trazos visibles e invisibles) y la familia de líneas entera se clona desplazándola perpendicularmente (`DeltaY`) y paralelamente (`DeltaX`).

### ⚖️ La Regla de Oro
**NUNCA se deben usar SVGs estáticos pre-diseñados (imágenes externas) como la fuente principal en backgrounds CSS (`background-image`).** El CSS repite estas imágenes usando `preserveAspectRatio="meet"`, lo que destruye el teselado, provoca gaps (márgenes transparentes gigantes) y genera borrosidad masiva por el remuestreo de trazos finos (`non-scaling-stroke` falla en backgrounds).

> [!WARNING]
> **Norma de Visualización de Íconos Estáticos (Catálogos y Fallbacks):**
> Cuando se deban renderizar tarjetas de catálogo de arquetipos (o fallbacks de arquetipos sin motor matemático) utilizando sus íconos `.svg` estáticos:
> 1. **Bypass Matemático:** En vistas de catálogo o grillas, se debe ignorar el motor `SvgPreviewEngine` y utilizar etiquetas `<img>` nativas, para respetar exactamente el diseño estético del `.svg` original.
> 2. **Grilla y Object Fit:** Los íconos deben mostrarse en una grilla nativa CSS (ej. `grid-template-columns: repeat(2, 1fr)`). Las imágenes DEBEN tener `object-fit: cover` con `width: 100%; height: 100%` dentro de un contenedor con `overflow: hidden`.
> 3. **Recorte en lugar de deformación:** La regla "Lo que sobre sobra" (`cover`) garantiza que la relación de aspecto del SVG no se deforme (a diferencia de `fill`), mientras inunda perfectamente el contenedor.
> 4. **Grosor de Líneas Inalterable:** Debido a que el SVG utiliza internamente `vector-effect="non-scaling-stroke"`, usar `cover` asegura que el navegador escale la imagen pero los trazos se mantengan SIEMPRE finos (generalmente de su stroke original), sin engordar ni deformarse al estirar la ventana.

> [!CAUTION]
> **Peligro: Colisión de IDs Globales en SVG React**
> Si varias instancias de `SvgPreviewEngine` (el motor matemático) se renderizan en una misma página, la etiqueta `<pattern id="...">` NO puede tener un ID estático (ej. `id="hatchPattern"`). 
> Los IDs en SVG son globales en el DOM. Si hay colisión, el navegador aplicará el diseño del primer `<pattern>` encontrado a TODOS los rectángulos de la página. 
> **Regla:** Siempre inyectar un identificador único en el motor: `<pattern id={\`hatchPattern-\${archetype.id}\`}>`.

Para lograr la verdadera parametrización, todo arquetipo **debe** tarde o temprano tener su función `generateSvgRenderer(params)` que use *las mismas variables matemáticas* que `generatePat(...)` para dibujar las etiquetas `<line>` directamente en un `<svg>`.

---

## 2. Geometría y Teselado Perfecto

Para que el archivo `.pat` de AutoCAD cierre perfectamente y no genere serruchos o roturas entre las columnas:

- **Ángulos Trigonométricos Estrictos:** El ángulo de una línea inclinada a menudo no puede ser arbitrario si queremos que repita en bloque. En patrones como el Chevron, el Ángulo se deriva estrictamente de las dimensiones: `angle = atan(Height / Width)`.
- **Cálculo de Desfase (DeltaX, DeltaY):**
  Cuando una línea inclinada forma parte de una columna y se repite verticalmente, el desplazamiento global en el `.pat` (`dX`, `dY`) se calcula proyectando la distancia vertical de repetición (`th`) sobre el vector de la línea:
  ```javascript
  const dX = th * sin(angleRad);
  const dY = th * cos(angleRad);
  ```
- **Unión sin Juntas:** Si un patrón requiere que las piezas se toquen sin separación (Joint = 0), las líneas verticales redundantes se pueden ignorar siempre y cuando los vértices de las diagonales se unan exactamente en las mismas coordenadas.

---

## 3. Lógica de Interfaz y "Reality Checks"

La interfaz debe forzar restricciones geométricas del mundo real para evitar generar archivos `.pat` matemáticamente imposibles o visualmente amorfos.

> [!TIP]
> **Relaciones Mínimas:** En `HatchGenerator.jsx`, usa los `useEffect` para limitar los inputs del usuario.
> Ejemplo: Para el Chevron, la tabla física no puede ser más ancha que larga. Por lo tanto, se debe forzar la regla `Width >= Height`. Si el usuario ingresa un ancho diminuto, el script debe autocorregirlo al valor del alto.

---

## 4. Historial de Desarrollo (Log de Conquistas)

### ¿Qué hemos logrado hasta ahora?
1. **Motor de Previsualización Matemática Paramétrica (`SvgPreviewEngine.jsx`):**
   - Eliminamos la dependencia de SVG estáticos distorsionados. 
   - Desarrollamos la lógica para que la previsualización lea las fórmulas matemáticas puras en tiempo real. 
   - Resolvimos el problema de **gaps (huecos)** y **borrosidad** aislando las imágenes en grillas CSS puras con `transform: scale()` para recortar el padding, y utilizando renderizado matemático donde está disponible.
   - El selector de patrones (Modal) y el panel de colección ahora muestran mallas en alta definición perfectamente ensambladas.

2. **Matemáticas Complejas Dominadas en `HatchEngine.js`:**
   - **Chevron:** Logramos calcular la trigonometría inversa (`Math.atan`) para que los ángulos se ajusten dinámicamente al largo y ancho ingresado por el usuario, sin que las líneas se desfasen.
   - **Herringbone (Espina de Pez):** Se descifró la matemática de teselado a 45 grados. Construimos un bucle matemático que simula el comportamiento de AutoCAD para dibujar segmentos de la espina de pez de cualquier tamaño, dentro de una matriz ortogonal SVG sin deformarse.

3. **Estandarización y Limpieza de Base de Datos (Firestore):**
   - El usuario tenía **196 hachuras** con nombres, categorías e íconos dispares heredados del sistema viejo.
   - Creamos un **Analizador Heurístico** que lee el código fuente `.pat` en el lado del servidor, extrae los ángulos y segmentos matemáticos, y los clasifica automáticamente.
   - Logramos unificar más del **50% del catálogo (95 hachuras)** con precisión absoluta en un solo clic, estandarizando sus categorías y reasignándoles SVGs matemáticos.
   - Dejamos el resto (67 orgánicos/complejos) en una cuarentena controlada (`needsReview: true`) listos para el pulido final.

4. **Mejora UX/UI (Hatch Generator):**
   - Se añadió un sistema de "Grid Layout" para la vista en vivo, permitiendo cambiar dinámicamente cuántas repeticiones (ej. 1x1, 3x3) se ven en pantalla, facilitando el trabajo de depuración y la vista previa del cliente.
   - Controles dinámicos: el panel lateral adapta sus campos ("Joint", "Spacing", "Rows") dependiendo de las necesidades matemáticas exclusivas de cada arquetipo seleccionado.

---

## 5. Plan a Largo Plazo: Integración del JSON Maestro

El objetivo final de este proyecto es migrar y parametrizar matemáticamente **todos** los arquetipos de patrones estáticos a fórmulas puras en `HatchEngine.js`.

### 🛠️ Flujo de Trabajo para Agregar un Nuevo Arquetipo

Como **Desarrollador o Agente Junior**, sigue rigurosamente estos pasos por CADA nuevo patrón que abordes:

1. **Seleccionar el Patrón:**
   Identifica la célula base geométrica.
2. **Programar `generatePat(w, h, j)`:**
   Analiza matemáticamente cómo debe desplazarse la línea en AutoCAD usando distancias perpendiculares (`DeltaY`) y de desplazamiento (`DeltaX`).
3. **Programar `generateSvgRenderer(params)`:**
   **MANDATORIO:** Traduce la misma lógica y vértices trigonométricos usados en `generatePat` hacia etiquetas `<line>` de SVG. No uses copypaste. Calcula las coordenadas `x1, y1, x2, y2` en base a `w, h, j`.
4. **Validación:**
   Usa el "Modo Célula Base" (Rows: 1, Cols: 1) para confirmar visualmente que el SVGRenderer cierra perfecto. Exporta el `.pat` a AutoCAD y verifica a escala. NUNCA procedas sin validar ambas vías.
