# Arquitectura de Datos y Separación por Capas

Este documento define las estructuras de base de datos en Firestore y la arquitectura de capas que sustenta el módulo SaaS de LispCentral.

---

## 1. Arquitectura de 4 Capas

### Capa 1 — Presentación (UI)
- **Tecnología:** React (paleta AutoCAD CEF), Astro (Dashboard Web)
- **Responsabilidad:** Renderizado, interacción, lógica de diff, filtros, navegación.
- **No hace:** Lógica de negocio pesada, manipulación directa del DWG.

### Capa 2 — API Serverless (Firebase Cloud Functions / Node.js)
Endpoints actuales:
| Endpoint | Método | Descripción |
|---|---|---|
| `getStandard` | GET | Retorna el estándar si el usuario tiene permiso |
| `syncStandard` | POST | Valida rol OWNER y persiste el estándar |
| `uploadDraft` | POST | Guarda snapshot temporal del DWG (usado por extract y audit) |
| `getDraft` | GET | La paleta hace polling para detectar draft nuevo |
| `joinTeam` | POST (callable) | Valida código de invitación y vincula usuario al equipo |

### Capa 3 — Persistencia (Firestore + Storage)
Ver esquemas en sección 2.

### Capa 4 — Motor de Ejecución (AutoCAD / AutoLISP)
- **Distribución JIT:** Los módulos LISP **no se escriben a disco en producción**. El Loader los descarga como strings y los evalúa con `Acad.Application.ExecuteLisp(sourceCode)` directamente en la memoria de AutoCAD.
- **Carpetas de fuente:**
  - `lisp/core/` — módulos de producción (servidos por el backend)
  - `lisp/dev/` — herramientas de testing local (nunca van al usuario)
- **Responsabilidades del motor LISP:**
  - `tmd_utils.lsp`: HTTP (WinHttp), escape JSON, api-base
  - `tmd_saas_extract.lsp`: Extrae Layers + TextStyles + DimStyles → JSON → Cloud
  - `core_engine.lsp`: `LC:apply-layer`, `LC:apply-textstyle`, `tmd:rename-layer`
  - `tmd_saas_audit.lsp`: Extrae snapshot del DWG para comparación (misma lógica que extract)

> [!IMPORTANT]
> La **lógica de comparación (diff) vive en el frontend** (React). El LISP solo extrae y aplica.
> Esto evita tener que parsear JSON en LISP, que no tiene soporte nativo.

---

## 2. Esquema Firestore

### `users` (existente, extendida)
```json
{
  "uid": "user_123",
  "hwid": "ABC-123",
  "email": "dibujante@email.com",
  "joinedTeams": [
    { "teamId": "team_A", "role": "MEMBER" },
    { "teamId": "team_B", "role": "OWNER" }
  ]
}
```

### `teams`
```json
{
  "teamId": "team_A",
  "ownerId": "user_999",
  "name": "Estudio Arquitectura A",
  "inviteCode": "TEAM-A9X2B",
  "subscriptionTier": "CORPORATE",
  "subscriptionActive": true,
  "isPublic": false,
  "createdAt": "2026-06-30T10:00:00Z"
}
```

### `standards` (documento por equipo)
```json
{
  "teamId": "team_A",
  "updatedAt": "2026-07-01T12:00:00Z",
  "layers": {
    "ARQ-MUROS": { "color": 1, "ltype": "Continuous", "lineweight": 30, "plottable": true, "description": "" }
  },
  "textStyles": {
    "Arial_Titulos": { "font": "arial.ttf", "bigfont": "", "height": 0.0 }
  },
  "dimStyles": {
    "ISO-25": { "dimscale": 1.0, "dimtxt": 2.5, "dimasz": 2.5, "dimdec": 4, "dimgap": 0.625 }
  },
  "blocks": {
    "Puerta_80": { "storageUrl": "gs://...", "defaultLayer": "ARQ-PUERTAS" }
  }
}
```

> [!NOTE]
> **Soft Delete (planificado, no implementado en MVP):** Elementos eliminados del estándar deben marcarse con `"_deprecated": true` en lugar de borrarse. Esto preserva el historial de auditorías y permite recuperación accidental. Actualmente `DiffMergePanel` hace `delete` real — pendiente de refactorizar.

### `drafts` (temporal)
Documento temporal creado por `uploadDraft`. La paleta hace polling con `getDraft` cada 2s.
Eliminado o sobreescrito en cada nueva extracción.
```json
{
  "teamId": "team_A",
  "createdAt": "...",
  "draftData": { "layers": {}, "textStyles": {}, "dimStyles": {} }
}
```

---

## 3. Sincronización y Señales

La comunicación entre LISP y la paleta React usa una variable del sistema de AutoCAD como señal:

| Variable | Valor | Significado |
|---|---|---|
| `USERS1` | `"LC_SAAS_DRAFT_READY"` | Draft subido — paleta inicia polling |
| `USERS1` | `"LC_SAAS_FORCE_RELOAD"` | Estándar actualizado — recargar vista |

El polling del frontend se hace cada **2000ms** con `clearInterval` al detectar un draft nuevo. Hay un timeout de seguridad de **30s** en `SaasPalette.jsx` para resetear el estado `isExtracting`.

> [!WARNING]
> El polling actual no tiene `AbortController`. Si el componente se desmonta mientras extrae, el interval puede persistir. Pendiente de fix en Fase 2.

---

## 4. Colores ACI

AutoCAD usa un índice de 256 colores (ACI). El frontend tiene un mapa de 9 colores básicos:
`1=Rojo, 2=Amarillo, 3=Verde, 4=Cyan, 5=Azul, 6=Magenta, 7=Blanco, 8=Gris oscuro, 9=Gris claro`

Colores fuera de este rango se muestran como `#AAAAAA`. **Pendiente:** Ampliar a la tabla ACI completa (~30 colores clave).

---

## 5. Principios de Escalabilidad

1. **1 lectura de Firestore** por sesión de paleta (norma completa como objeto JSON único).
2. **LISP nunca parsea JSON** — JS orquesta, LISP ejecuta.
3. **Virtualización de listas** con `react-window` para normas de +500 elementos sin lag en CEF.
