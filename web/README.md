# LispCentral Web Portal

Plataforma definitiva para BIM Managers y Arquitectos. Sistema construido con Astro, React, y TailwindCSS, con autenticación y bases de datos vía Firebase.

## 🏗 Arquitectura y Estructura

El proyecto está diseñado con un enfoque fuerte en SEO e i18n (Internacionalización) estática.

```text
/
├── public/                 # Assets estáticos (imágenes, SVGs)
├── src/
│   ├── components/         # Componentes UI (Astro y React)
│   ├── content/
│   │   ├── docs/           # Artículos de Ayuda (Markdown) localizados en /en, /es, /pt
│   │   └── blog/           # Artículos de Blog (Markdown) localizados
│   ├── i18n/               # Diccionarios de traducción y utilidades (localizeUrl)
│   ├── layouts/            # Layouts base (Layout.astro, DocsLayout.astro)
│   └── pages/
│       ├── index.astro     # Landing page (Inglés por defecto con auto-redirección)
│       └── [lang]/         # Páginas estáticas para cada idioma (es, pt, en)
│           ├── dashboard.astro
│           ├── help/       # Renderiza Content Collections de Ayuda
│           └── ...
└── astro.config.mjs        # Configuración de Astro e integraciones
```

## 🌍 Sistema i18n y Colecciones de Contenido

- **Rutas Prefijadas Estáticamente**: Utilizamos generación estática (SSG) mediante el directorio `src/pages/[lang]/`. Cada página del sitio existe físicamente bajo su ruta de idioma (ej. `/es/dashboard`, `/pt/help`), garantizando perfecta indexación por motores de búsqueda sin 404s ni redirecciones dinámicas rotas.
- **Content Collections**: Los artículos de ayuda y blog se administran como archivos `.md` en `src/content/`. Utilizamos `getStaticPaths` para mapear los slugs según su idioma de forma nativa.
- **Auto-Redirección (Root)**: Al visitar la raíz (`/`), un script evalúa el `localStorage` o el idioma del navegador (`navigator.language`) para redirigir automáticamente al usuario a su idioma de preferencia (`/es/` o `/pt/`), respetando el estándar moderno de navegación.

## 🚀 Comandos

| Comando                   | Acción                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Instala las dependencias                         |
| `npm run dev`             | Inicia el servidor local en `localhost:4321`     |
| `npm run build`           | Construye el sitio de producción en `./dist/`    |
| `npm run preview`         | Vista previa local de la build generada          |
| `firebase deploy`         | Despliega la carpeta `dist/` a Firebase Hosting  |

## 🛠 Tecnologías Principales
- **Astro**: Framework web para contenido estático ultrarrápido.
- **React**: Componentes interactivos (Dashboard, calculadoras) que se hidratan con `client:load`.
- **Tailwind CSS**: Utilidades de diseño responsivo y sistema de diseño.
- **Firebase**: Autenticación, Storage, Firestore y Hosting.
