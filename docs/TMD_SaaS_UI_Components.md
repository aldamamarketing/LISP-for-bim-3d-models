# Arquitectura de Componentes UI

Este módulo SaaS es un **add-on independiente** de LispCentral. Se desarrolla y prueba como paleta separada (`saas-palette.html`). Una vez estabilizado, será integrado en el flujo principal de la aplicación.

---

## 1. Paleta AutoCAD (CEF) — Componentes Actuales

### Layout General
```
┌─────────────────────────────┐
│ [≡] LISPCENTRAL NORMAS [Sync]│  ← TopBar
│ [🔍 Search layer/style...  ] │  ← MultiFilter
│ [Personal Standard ▼]  [☁↑] │  ← ContextSwitcher + SyncButton (OWNER only)
├─────────────────────────────┤
│                             │
│   StandardsList             │  ← Área principal (flex: 1)
│   [Capas (12)] [Estilos (3)]│  ← Tabs
│   ─────────────────────────  │
│   LAYER-NAME           ●    │  ← Rows virtualizadas (react-window)
│   ...                       │
│                             │
├─────────────────────────────┤
│ □ Apply automatically       │  ← Footer (OCULTO durante edición)
│ [  Apply Standard to DWG  ] │
└─────────────────────────────┘
```

**Comportamiento durante edición (DiffMergePanel activo):**
- Footer se oculta (`isEditingStandard = true`) → maximiza área de revisión
- ContextSwitcher se atenúa y bloquea (`pointer-events: none`)
- Barra de búsqueda sigue funcional y filtra dentro del DiffMergePanel

---

### `SaasPalette.jsx` — Contenedor Principal
**Estado global de la paleta:**
- `activeTeamId`: equipo activo
- `isOwner`: si el usuario actual es OWNER del equipo
- `activeFilters`: filtros de búsqueda activos (string[])
- `isExtracting`: true mientras espera el draft del LISP
- `isEditingStandard`: true mientras DiffMergePanel está visible

**Acciones:**
- `handleSync()` → `executeInAutoCAD('LC_SYNC')`
- `handleUploadStandard()` → `executeInAutoCAD('(LC:extract-standards) ')` → inicia polling
- `handleInject()` → llama `LC:apply-layer` por cada ítem del estándar (pendiente de implementar)

---

### `ContextSwitcher.jsx` — Selector de Equipo
- Dropdown personalizado (no `<select>` nativo — pierde foco fácilmente)
- Lista equipos del usuario con roles
- Opción especial `[+ Unirse a un Equipo]` → abre modal con campo para código de invitación
- Al seleccionar: dispara `onContextChange(teamId, isOwner)`
- Se bloquea durante edición vía `pointer-events: none` desde el padre

---

### `StandardsList.jsx` — Lista Principal de Normas
- Recibe `teamId`, `searchFilters`, `isExtracting`, `onExtractComplete`, `onEditingStateChange`
- **Modo paleta (sin auth):** fetch REST a `getStandard`
- **Modo dashboard (con auth):** `onSnapshot` de Firestore
- Tabs: **Capas** | **Estilos** (pendiente: + DimStyles)
- Lista virtualizada con `react-window` — `height={300}` hardcodeado (deuda técnica: debe ser dinámico)
- Polling a `getDraft` cuando `isExtracting=true`, cada 2000ms
- Al detectar draft → abre `DiffMergePanel` y notifica al padre con `onEditingStateChange(true)`

---

### `DiffMergePanel.jsx` — Panel de Revisión de Cambios
Modo pantalla completa (position: absolute, z-index: 100) dentro de `StandardsList`.

**Lógica de diff (3-way):**

| Sección | Color | Descripción | Default |
|---|---|---|---|
| New in DWG | 🔵 Azul | En DWG, no en Cloud | ✅ Marcado |
| Modified | 🟡 Ámbar | En ambos, propiedades distintas | ❌ Desmarcado |
| Missing in DWG | 🔴 Rojo | En Cloud, no en DWG | ❌ Desmarcado |

**Pendiente (deuda técnica):**
- Sub-grupos colapsables por tipo dentro de cada sección: `▶ Layers (12)` / `▶ TextStyles (2)` / `▶ DimStyles (1)`
- DimStyles no aparece aún en el diff (el LISP ya los extrae, el frontend no los procesa)
- `handleSelectAllGlobal` tiene lógica de toggle incorrecta cuando hay filtros activos

**Filtrado:** Respeta `searchFilters` del padre — filtra `item.key` en tiempo real.

**Commit:** POST a `syncStandard` con el objeto `merged` resultante.

---

### `MultiFilter.jsx` — Barra de Búsqueda
- Filtrado multi-término (cada término separado, todos deben coincidir — AND)
- Persiste en `localStorage` vía `storageKey`
- Funciona durante la vista normal Y durante DiffMergePanel

---

## 2. Componentes Pendientes (MVP)

| Componente | Descripción | Prioridad |
|---|---|---|
| **DiffMergePanel — Sub-grupos colapsables** | Agrupa ítems por tipo (Layers/TextStyles/DimStyles) dentro de cada sección | Alta |
| **DimStyles en StandardsList** | Tab adicional para DimStyles, igual que Capas y Estilos | Media |
| **Apply Standard (handleInject)** | Conectar botón naranja: JS itera estándar y llama `LC:apply-layer` por ítem | Alta |
| **Audit Panel** | Vista similar a DiffMergePanel pero en dirección inversa (Cloud es fuente de verdad) | Media |
| **Layer Rename UI** | En Audit: dropdown para mapear capa no-estándar a capa del estándar | Baja (Fase 2) |

---

## 3. Componentes del Dashboard Web (Fuera de AutoCAD — Fase 2)

| Componente | Descripción |
|---|---|
| `TeamManager` | Generar/regenerar código de invitación, tabla de miembros, revocar acceso |
| `StandardsViewer` | Tabla de solo lectura de la norma. Ediciones manuales urgentes sin abrir AutoCAD |
| `BillingPanel` | Gestión de suscripción Stripe (Tier, estado de pago, método de pago) |

---

## 4. Decisiones de Diseño Fijas

- **No dropdowns nativos (`<select>`):** Pierden el foco fácilmente en CEF. Usar listas custom.
- **Sin padding excesivo en rows:** La paleta tiene máximo ~300px de ancho. Cada px cuenta.
- **Sin cards/bordes redondeados en listas:** Diseño plano, filas continuas, separadores sutiles (`1px solid #333`).
- **Puntos de color ACI:** `width: 8px, height: 8px, borderRadius: 50%`. Siempre a la derecha de la fila, con `padding-right: 20px` para no quedar ocultos por el scrollbar.
- **Color scheme:** Fondo `#111827`, filas alternas via hover, cabeceras de sección `#1e293b`.

### Modo Auditor�a (Audit Mode)
- **DiffMergePanel adaptado**: El mismo panel de Diff ahora soporta dos modos (mode='extract' y mode='audit').
- En modo Audit, la interfaz muestra las desviaciones del DWG respecto a la Nube bajo las categor�as: Extra in DWG (Ignore), Deviates (Fix in DWG), y Missing (Create in DWG).
- **Inyecci�n din�mica de LISP**: Al confirmar los cambios en modo Audit, el componente StandardsList genera din�micamente comandos (LC:apply-layer ...) y (LC:apply-textstyle ...) inyect�ndolos directo a AutoCAD mediante el bridge, corrigiendo el dibujo activo sin modificar el Standard en la Nube.
