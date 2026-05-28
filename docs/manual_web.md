# LispCentral - Manual de Arquitectura Web (MVP)

Este documento detalla la arquitectura frontend y backend implementada para el portal de LispCentral.

## 1. Arquitectura de Hosting
- **Proveedor:** Firebase Hosting.
- **Ruta Pública:** Carpeta `/web/` alojada en `lispcentral.web.app`.
- **Enrutamiento:** `firebase.json` utiliza `cleanUrls: true` para omitir la extensión `.html` en las URLs y no utiliza una regla Catch-All (`**`), permitiendo el enrutamiento multipágina estático.

## 2. Estructura de Directorios
```text
/web
 ├── index.html           # Home Institucional
 ├── download.html        # Central de Descargas (Generador de API Keys)
 ├── styles.css           # CSS Centralizado (Autodesk Theme)
 ├── docs/
 │    ├── index.html      # Hub de Documentación
 │    ├── lc-joints.html  # Documentación de Comando
 │    └── lc-build.html   # Documentación de Comando
 └── legal/
      ├── privacy.html    # Política de Privacidad
      └── terms.html      # Términos de Uso
```

## 3. Generación Dinámica del LISP (Cero Fricción)
El archivo `download.html` contiene un script embebido que evita que el usuario tenga que lidiar con bases de datos o inicios de sesión complejos durante la fase MVP.

1. **Generación de Clave:** Al introducir un email, se genera un ID aleatorio con el prefijo `trial_tmd_xxxx`.
2. **Plantilla Blob:** El código fuente completo de `LC_Loader.lsp` (basado en `loader_template.lsp`) está definido en un `template literal` en JavaScript.
3. **Inyección:** La API Key generada se inyecta dinámicamente en la variable `*LISPCENTRAL-KEY*` dentro del template.
4. **Descarga Instantánea:** Se crea un objeto `Blob` tipo `text/plain` y se fuerza la descarga mediante la creación y clic virtual de un tag `<a>` con nombre de archivo `LC_Loader.lsp`. 

## 4. Backend Autorizador (Cloud Functions)
La validación de estas llaves ocurre en `functions/index.js`, donde la API de Google Cloud Run acepta inmediatamente cualquier petición GET donde el parámetro `apiKey` comience por `trial_tmd_`. Esto permite una experiencia "plug and play" en AutoCAD.

---

## 5. Evolución a Astro y React (Arquitectura Moderna)
El stack original de HTML plano (MVP) fue migrado a **Astro y React** para soportar herramientas interactivas complejas y multi-idioma (i18n).

### 5.1 Generador de Iconos con IA (Icon Factory)
Se introdujo una nueva herramienta en el portal web (`/pt/tools/icon-generator`) que permite a los desarrolladores LISP generar automáticamente íconos SVG para sus comandos de AutoCAD.

- **Frontend (React + Astro):** Una interfaz de 3 columnas (Configuración, Previsualización de variaciones y Carrito de Exportación). Soporta Live Update de colores usando variables CSS (`var(--icon-accent)`), y cambio de modo Claro/Oscuro en tiempo real.
- **Backend (Firebase Functions):** Endpoint `generateIcons` que se conecta a la API de Google Gemini (`gemini-flash-latest`) para generar vectores estructurados en JSON. Utiliza Secret Manager para proteger la `GEMINI_API_KEY`.
- **Exportación Local (Cero Backend Storage):** Los SVGs devueltos por la IA se empaquetan en un archivo `.zip` directamente en el navegador del usuario usando `JSZip` y `Canvas` API, generando automáticamente versiones en 16x16 y 32x32 para temas claros y oscuros, listos para los archivos CUIx de AutoCAD.
