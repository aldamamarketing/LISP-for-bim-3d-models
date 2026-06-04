# Front-End Architecture: React & Astro (v5.0)

Este documento detalla las decisiones arquitectónicas clave tomadas durante la refactorización del frontend (SaaS Console y Landing Page) para LispCentral.

## 1. Dashboard Refactoring (React)

El monolito original `Dashboard.jsx` superaba las 1200 líneas de código, gestionando simultáneamente la autenticación, carga de LISPs, perfiles de usuario, notificaciones y la UI de múltiples pestañas.

### 1.1. Context API (`DashboardContext.jsx`)
Para solucionar el problema de "Prop Drilling" y separar la lógica de negocio de la capa de presentación, se introdujo el patrón **React Context API**.
- **`DashboardProvider`**: Actúa como el único punto de verdad para el estado de Firebase. Gestiona `userData`, `tenantLisps`, `seats`, `draftLisps`, notificaciones y el estado de carga inicial (`loading`).
- **`useDashboard` hook**: Permite a cualquier subcomponente acceder y mutar el estado global sin necesidad de pasar props a través de múltiples niveles de componentes.

### 1.2. Componentes Granulares (`src/components/dashboard/`)
El archivo `Dashboard.jsx` se redujo a actuar puramente como un controlador de Layout (Header, Sidebar y Content Switcher). Todo el contenido específico de cada pestaña se extrajo a componentes aislados:
- `AuthLogin.jsx`: Maneja el flujo de registro, login y reseteo de contraseñas de Firebase Auth.
- `ProfileTab.jsx`: Renderiza la información del usuario y el formulario de edición de perfil.
- `LicensesTab.jsx`: Gestiona la lógica de "Seats" (Asientos) y vinculación/desvinculación de dispositivos físicos (Computadoras con AutoCAD).
- `LispManagerTab.jsx`: Contiene la lógica compleja de subida masiva de rutinas `.lsp`, edición interactiva de íconos SVG y asignación de Grupos/Suites semánticos.
- `SupportModal.jsx`: Modal superpuesto global para el reporte de bugs y retroalimentación de los usuarios.

## 2. Internacionalización (i18n)

Se adoptó un enfoque sistemático para garantizar que toda la plataforma esté disponible en Inglés (EN), Español (ES) y Portugués (PT).
- **`translations.js`**: Diccionarios estáticos estructurados jerárquicamente.
- **Hook `getLangFromUrl`**: Analiza la URL (ej. `/pt/dashboard` o `/en/tools`) para inyectar automáticamente el idioma correcto.
- **Función `t()`**: Implementada consistentemente a lo largo de componentes React (`useTranslation`) y componentes estáticos de Astro (`Features.astro`, `FAQ.astro`, etc.).

## 3. UI/UX & Micro-animaciones

El frontend utiliza **Tailwind CSS** con variables semánticas (Design Tokens) definidos en `tailwind.config.mjs` (`surface-container`, `primary-container`, etc.).

### 3.1. Principios de Interacción
- **Scroll Reveal**: Se implementó un `IntersectionObserver` global en el footer de `Layout.astro` que busca elementos con la clase `.reveal` y les aplica clases de transición dinámica (`reveal-visible`) a medida que entran en el viewport.
- **Tab Transitions**: La clase `.tab-enter` fue añadida al CSS global y aplicada a cada subcomponente del Dashboard para lograr una transición suave (`opacity` y `transformY`) al cambiar entre vistas.
- **Accesibilidad**: Se incorporaron directivas `:focus-visible` globales para resaltar interacciones mediante teclado, esencial para entornos corporativos B2B.

## 4. Despliegue y CI/CD

El proyecto Astro es compilado usando **GitHub Actions**. Al pushear a la rama `main`, la acción compila el sitio (`npm run build`) e inyecta los resultados en **Firebase Hosting**. 
Los errores de lint o importación en la nueva estructura del `Dashboard` son atrapados por el build step de Vite antes de subir a producción, garantizando estabilidad.
