# LispCentral - Manual de Arquitectura Web

Este documento detalla la arquitectura frontend y backend moderna implementada para el portal de LispCentral.

## 1. Arquitectura de Hosting y Core
- **Proveedor:** Firebase Hosting (Web) + Firebase Cloud Functions (Backend).
- **Ruta Pública:** Alojada en `lispcentral.web.app` / `lispcentral.com`.
- **Framework Principal:** Astro + React. El proyecto migró de HTML puro a un entorno SSR/SSG con islas de React interactivas.
- **Estilizado:** Tailwind CSS configurado con un sistema semántico de **Material Design 3**. Toda la aplicación usa tokens (`bg-surface`, `text-primary-container`) en lugar de colores hardcodeados.

## 2. Generación Dinámica del LISP (Cero Fricción)
El portal provee scripts embebidos que evitan que el usuario tenga que lidiar con configuraciones manuales:
1. **Generación de Clave:** Las sesiones generan UUIDs con el prefijo `trial_tmd_xxxx`.
2. **Plantilla Blob:** El código fuente de `LC_Loader.lsp` se empaqueta en el Frontend.
3. **Inyección Dinámica:** La API Key generada se inyecta en el script LISP y se crea un Blob para forzar su descarga local.
4. **Validación:** Google Cloud Run (Functions) autoriza peticiones con este prefijo.

## 3. Gestor de Comandos (Dashboard LISP)
El Dashboard de usuario es una aplicación SPA interna en React (`DashboardContext.jsx`) donde los creadores gestionan sus comandos BIM:
- **Parser de LISP:** Al arrastrar un archivo `.lsp`, el cliente lee su contenido y detecta las rutinas usando RegExp (`defun c:XYZ`), creando borradores de comandos automáticamente.
- **Gestión de Íconos en Base64:** La subida de imágenes `.png/.jpg` usa Canvas API en el navegador para escalar íconos exactamente a 32x32 px y codificarlos en Base64 para almacenarlos sin fricción en Firebase Firestore. Los archivos SVG son sanitizados antes del guardado.
- **Drag & Drop HTML5:** La jerarquía de organización (Suites > Grupos) se maneja con la API nativa de Drag and Drop del navegador para alto rendimiento, evitando librerías npm pesadas.

## 4. Suite de Generadores con IA (Lead Magnets)
Se implementaron tres herramientas interactivas (`/tools/...`) como B2B Lead Magnets para desarrolladores de AutoCAD:
- **Generador de Iconos SVG:** Interfaz React que dialoga con IA para diseñar iconos vectoriales bicolores para botones CUIx.
- **Generador de Patrones (Hatch .pat):** Permite describir texturas, calculando la trigonometría requerida para AutoCAD.
- **Generador de Líneas (.lin):** Constructor visual de linetypes.
- **Backend (DeepSeek AI):** Los endpoints en Cloud Functions consumen la API de DeepSeek V3/V4 por su extrema eficiencia matemática para coordenadas SVG frente a otros modelos.

## 5. Estructura de Firestore (Base de Datos)
El modelo de datos se basa en relaciones NoSQL donde las UID semánticas previenen conflictos:
- `users`: Perfil y licencias. UID: `USR-{fecha}-{slug}`.
- `lispFiles`: Referencias a archivos LISP alojados en Firebase Storage.
- `commands`: Cada comando extraído.
- `suites` y `groups`: Contenedores organizativos creados por el usuario.
- `groupCommands`: Colección puente para asignar comandos a múltiples grupos (many-to-many simplificado).
- `publicAssets`: Favoritos e Íconos comunitarios.
