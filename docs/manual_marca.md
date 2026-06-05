# LispCentral - Manual de Marca e Identidad

Este documento define la estética, los colores y las directrices visuales aplicadas a los productos de software e interfaces de LispCentral.

## 1. Identidad Central
- **Nombre del Producto:** LispCentral (Anteriormente referenciado como ecosistema TMD).
- **Abreviación de Comandos:** `LC_` (Ej: `LC_JOINTS`, `LC_BUILD`).
- **Posicionamiento:** Automatización estructural BIM paramétrica sin fricción, ejecutada directamente en el núcleo geométrico de AutoCAD (3DSOLID).

## 2. Sistema de Diseño (Material Design 3 + Tailwind CSS)
La interfaz ha evolucionado de colores hexadecimales estáticos a un sistema semántico moderno impulsado por Tailwind CSS y basado en los principios de Material Design 3. Esto garantiza un "Modo Oscuro" que imita el ecosistema nativo de Autodesk (AutoCAD / Revit) pero con interactividad y escalabilidad premium.

### Paleta Semántica Principal (Modo Oscuro)
Todos los colores se manejan dinámicamente a través de la configuración de Tailwind (`tailwind.config.mjs`):
- **Superficies (Backgrounds & Cards):**
  - `bg-background` / `bg-surface` (`#121414`): El fondo más oscuro para la página principal.
  - `bg-surface-container-low` a `highest`: Tonos sutilmente más claros para tarjetas, modales y barras superiores.
- **Acento (LispCentral Orange):**
  - `primary-container` (`#ff6b00`): El naranja de identidad corporativa. Usado para botones principales, estados activos y elementos de atención.
  - `on-primary-container`: El color del texto sobre fondos naranjas (para legibilidad).
- **Textos e Íconos:**
  - `text-on-surface` (`#e3e2e2`): Blanco hueso para texto principal de alta lectura.
  - `text-on-surface-variant`: Textos secundarios o apagados (muted).
- **Bordes:**
  - `border-outline-variant`: Para dividir paneles y tablas sin causar fatiga visual.

## 3. Tipografía
El ecosistema utiliza fuentes modernas, optimizadas para interfaces de software web premium:
- **Familia Primaria:** `'Inter', sans-serif`
  - Utilizada para todos los encabezados (Headlines) y textos de la interfaz (Body/Labels). Provee una lectura excepcionalmente limpia para herramientas B2B.
- **Tipografía Técnica:** `'JetBrains Mono', monospace`
  - Utilizada exclusivamente para código LISP, nombres de comandos (`LC_...`) y cualquier texto de sintaxis técnica. Reemplazó a Consolas para lograr un look de "Developer Tool" moderna.

## 4. UI/UX Layout
- **Componentes Planos (Flat UI):** Priorizamos vistas estilo "GitHub" (tablas densas y limpias) en lugar de "Cards dentro de Cards". Los bordes son finos de un pixel (`border-outline-variant`) sin sombras recargadas.
- **Patrón "Docs-Sidebar":** El dashboard y las herramientas utilizan un Sidebar anclado a la izquierda para navegación constante.
- **Modales Seguros:** La edición de configuraciones complejas (como Suites de comandos) se ejecuta en ventanas Modales superpuestas con botones de confirmación, en lugar de edición en línea (inline) que puede inducir a error.

## 5. Independencia
LispCentral es un proyecto de software independiente. Cualquier mención a "TM Digital" se excluye explícitamente de las interfaces, pies de página o documentos legales públicos, para asegurar la propiedad e identidad del creador original del proyecto.
