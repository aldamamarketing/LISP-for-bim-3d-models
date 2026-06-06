# Design System: LispCentral Web UI

Este documento estandariza la creación de interfaces para el dashboard de LispCentral, garantizando consistencia, mantenibilidad y escalabilidad a medida que el proyecto crece.

## 1. Principio Fundamental: DRY (Don't Repeat Yourself)
Nunca se deben "hardcodear" (incrustar directamente) combinaciones largas de clases de Tailwind para componentes repetitivos como Tarjetas (Cards), Botones o Modales. Todo elemento repetitivo debe ser abstraído en un componente de React dentro del directorio `web/src/components/ui/`.

## 2. Componentes Centralizados

### 2.1 Tarjetas (`Card`, `CardHeader`)
**Ubicación:** `web/src/components/ui/Card.jsx`
**Propósito:** Contener secciones de información, tablas o formularios en el Dashboard.

**Reglas de Uso:**
- Siempre importar `<Card>` en lugar de crear un `<div className="bg-surface...">`.
- Para tarjetas que contienen listas o tablas que deben tocar los bordes, usar el prop `noPadding={true}`.
- Nunca anidar un `<Card>` dentro de otro `<Card>`. Si se necesita agrupar información interna, utilizar un div simple con un fondo más oscuro (`bg-surface-container-high` o `lowest`) sin bordes rígidos.

**Ejemplo de implementación:**
```jsx
import { Card, CardHeader } from '../ui/Card';

<Card noPadding={true}>
  <CardHeader 
    title="Mis Licencias" 
    icon="key" 
    action={<button className="btn">Comprar</button>} 
  />
  {/* Contenido sin padding */}
  <Table />
</Card>
```

### 2.2 Botones y Acciones (Próximamente)
**Reglas:** Mantener botones consistentes utilizando las clases base `.btn` definidas en el CSS global o creando un componente `<Button>` en el futuro si se requieren estados de carga complejos (Spinners).

## 3. Jerarquía Visual y Tokens (Tailwind)
La plataforma utiliza un diseño Glassmorphism/Dark Mode estricto. Los tokens de Tailwind deben respetarse:
- **Fondos principales (App):** `bg-background`
- **Superficies de Tarjetas:** `bg-surface`
- **Bordes Divisores:** `border-outline-variant`
- **Textos Primarios:** `text-on-surface`
- **Textos Secundarios (Descriptivos/Muted):** `text-on-surface-variant`
- **Acentos y Llamados a la Acción (CTA):** `bg-primary-container` (Naranja corporativo)

Cualquier cambio a estos colores globales debe hacerse desde la configuración de Tailwind, no sobrescribiéndolos en componentes individuales.
