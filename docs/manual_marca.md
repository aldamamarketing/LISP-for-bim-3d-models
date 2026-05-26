# LispCentral - Manual de Marca e Identidad

Este documento define la estética, los colores y las directrices visuales aplicadas a los productos de software e interfaces de LispCentral.

## 1. Identidad Central
- **Nombre del Producto:** LispCentral (Anteriormente referenciado como ecosistema TMD).
- **Abreviación de Comandos:** `LC_` (Ej: `LC_JOINTS`, `LC_BUILD`).
- **Posicionamiento:** Automatización estructural BIM paramétrica sin fricción, ejecutada directamente en el núcleo geométrico de AutoCAD (3DSOLID).

## 2. Paleta de Colores (Autodesk / Dark Theme)
La interfaz de usuario está diseñada deliberadamente en un "Modo Oscuro" que imita el ecosistema nativo de Autodesk (AutoCAD / Revit) para generar un sentimiento inmediato de familiaridad y compatibilidad profesional.

- **Background Principal (`--bg-darker`):** `#121212` (Gris casi negro, evita el contraste hiriente).
- **Background Headers/Nav (`--bg-dark`):** `#1e1e1e` (Gris oscuro estándar de paneles).
- **Background Cards/Paneles (`--bg-card`):** `#2d2d2d` (Elevación visual suave).
- **Texto Principal (`--text-main`):** `#f0f0f0` (Blanco hueso para alta legibilidad).
- **Texto Muted (`--text-muted`):** `#aaaaaa` (Gris claro para breadcrumbs y menús inactivos).
- **LispCentral Orange (`--tmd-orange`):** `#f26d21` (El color de acento principal corporativo. Usado en botones, links activos y bordes de resaltado).

## 3. Tipografía
- **Familia Primaria:** `'Segoe UI', 'Roboto', 'Arial', sans-serif`
  - Se utilizan fuentes de sistema (Sans-Serif) limpias para garantizar que la interfaz técnica cargue instantáneamente y luzca moderna sin importar el sistema operativo, reflejando interfaces de software robusto.
- **Jerarquía:**
  - `<h1>`: Pesos ligeros (`font-weight: 300`) y tamaños grandes (`2.5rem` a `3rem`) para títulos principales limpios.
  - Párrafos: Altura de línea amplia (`line-height: 1.6`) para facilitar la lectura de documentación técnica.
  - Bloques de Código: Fuente monoespaciada (`'Consolas', monospace`) con texto en tono lima-verdoso (`#a6e22e`) para imitar el sintaxis clásico de los editores técnicos.

## 4. UI/UX Layout (Documentación)
- **Patrón "Docs-Sidebar":** Todo el portal de documentación utiliza un Sidebar anclado a la izquierda (280px de ancho) con el árbol completo de comandos `LC_`. 
- **Breadcrumbs:** Rutas visuales en la parte superior del contenido (`Home > Documentação > Comandos`) para facilitar el retorno en una estructura técnica profunda.

## 5. Independencia
LispCentral es un proyecto de software independiente. Cualquier mención a "TM Digital" se excluye explícitamente de las interfaces, pies de página o documentos legales públicos, para asegurar la propiedad e identidad del creador original del proyecto.
